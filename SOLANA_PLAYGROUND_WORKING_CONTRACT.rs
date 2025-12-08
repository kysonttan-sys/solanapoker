use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("FMuPdx45D9yvsGTVPBJuZ4SVK7zTDbYuGCLnDz2CW8cR");

#[program]
pub mod solpoker_vault {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        msg!("🔧 Initializing vault...");
        let vault_state = &mut ctx.accounts.vault_state;
        vault_state.authority = ctx.accounts.authority.key();
        vault_state.total_deposited = 0;
        vault_state.total_withdrawn = 0;
        msg!("✅ Vault initialized");
        Ok(())
    }

    pub fn buy_in(ctx: Context<BuyIn>, amount: u64) -> Result<()> {
        msg!("🔧 Processing deposit of {} lamports", amount);
        require!(amount > 0, VaultError::InvalidAmount);
        
        let user_state = &mut ctx.accounts.user_state;
        let vault_state = &mut ctx.accounts.vault_state;

        // Transfer SOL from user to vault
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;

        msg!("💰 Transfer complete");

        // Update user state
        user_state.owner = ctx.accounts.user.key();
        user_state.balance = user_state.balance.saturating_add(amount);
        user_state.last_deposit = Clock::get()?.unix_timestamp;

        // Update vault state
        vault_state.total_deposited = vault_state.total_deposited.saturating_add(amount);

        msg!("✅ Deposit recorded: user balance = {}", user_state.balance);
        Ok(())
    }

    pub fn leave_table(ctx: Context<LeaveTable>, amount: u64) -> Result<()> {
        msg!("🔧 Processing withdrawal of {} lamports", amount);
        require!(amount > 0, VaultError::InvalidAmount);
        
        let user_state = &mut ctx.accounts.user_state;
        let vault_state = &mut ctx.accounts.vault_state;

        // Verify ownership
        require!(
            user_state.owner == ctx.accounts.user.key(),
            VaultError::UnauthorizedWithdraw
        );

        // Check balance
        require!(
            user_state.balance >= amount,
            VaultError::InsufficientBalance
        );

        msg!("📤 Transferring {} lamports from vault to user", amount);

        // Transfer SOL from vault to user
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user.to_account_info(),
                },
                &[&[b"vault", &[ctx.bumps.vault]]],
            ),
            amount,
        )?;

        msg!("💰 Transfer complete");

        // Update user state
        user_state.balance = user_state.balance.saturating_sub(amount);
        user_state.last_withdrawal = Clock::get()?.unix_timestamp;

        // Update vault state
        vault_state.total_withdrawn = vault_state.total_withdrawn.saturating_add(amount);

        msg!("✅ Withdrawal recorded: user balance = {}", user_state.balance);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + VaultState::INIT_SPACE,
        seeds = [b"vault-state"],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyIn<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"vault-state"],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserState::INIT_SPACE,
        seeds = [b"user-state", user.key().as_ref()],
        bump
    )]
    pub user_state: Account<'info, UserState>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LeaveTable<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"vault-state"],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,
    
    #[account(
        mut,
        seeds = [b"user-state", user.key().as_ref()],
        bump
    )]
    pub user_state: Account<'info, UserState>,
    
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct VaultState {
    pub authority: Pubkey,
    pub total_deposited: u64,
    pub total_withdrawn: u64,
}

#[account]
#[derive(InitSpace)]
pub struct UserState {
    pub owner: Pubkey,
    pub balance: u64,
    pub last_deposit: i64,
    pub last_withdrawal: i64,
}

#[error_code]
pub enum VaultError {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Unauthorized withdrawal")]
    UnauthorizedWithdraw,
}
