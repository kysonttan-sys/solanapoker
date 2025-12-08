use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("FMuPdx45D9yvsGTVPBJuZ4SVK7zTDbYuGCLnDz2CW8cR");

#[program]
pub mod solpoker_vault {
    use super::*;

    /// Initialize vault (only called once by admin)
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        msg!("🔧 Starting initialize_vault");
        
        let vault_state = &mut ctx.accounts.vault_state;
        vault_state.total_deposited = 0;
        vault_state.total_withdrawn = 0;
        vault_state.authority = ctx.accounts.authority.key();
        
        msg!("✅ Vault initialized with authority: {}", ctx.accounts.authority.key());
        Ok(())
    }

    /// Deposit SOL into the vault (buy in)
    pub fn buy_in(ctx: Context<BuyIn>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::InvalidAmount);
        
        let user = &ctx.accounts.user;
        let vault_state = &mut ctx.accounts.vault_state;
        let user_state = &mut ctx.accounts.user_state;

        // Transfer SOL from user to vault PDA
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: user.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update user state
        user_state.balance = user_state.balance.checked_add(amount)
            .ok_or(VaultError::ArithmeticOverflow)?;
        user_state.owner = user.key();
        user_state.last_deposit = Clock::get()?.unix_timestamp;

        // Update vault state
        vault_state.total_deposited = vault_state.total_deposited.checked_add(amount)
            .ok_or(VaultError::ArithmeticOverflow)?;

        msg!("User {} deposited {} lamports", user.key(), amount);
        Ok(())
    }

    /// Withdraw SOL from the vault (leave table / cash out)
    pub fn leave_table(ctx: Context<LeaveTable>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::InvalidAmount);
        
        let user_state = &mut ctx.accounts.user_state;
        let vault_state = &mut ctx.accounts.vault_state;
        let user = &ctx.accounts.user;

        // Verify ownership
        require!(
            user_state.owner == user.key(),
            VaultError::UnauthorizedWithdraw
        );

        // Check user has sufficient balance
        require!(
            user_state.balance >= amount,
            VaultError::InsufficientBalance
        );

        // Transfer SOL from vault to user via CPI with vault PDA signature
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: user.to_account_info(),
                },
                &[&[b"vault", &[ctx.bumps.vault]]],
            ),
            amount,
        )?;

        // Update user state
        user_state.balance = user_state.balance.checked_sub(amount)
            .ok_or(VaultError::ArithmeticUnderflow)?;
        user_state.last_withdrawal = Clock::get()?.unix_timestamp;

        // Update vault state
        vault_state.total_withdrawn = vault_state.total_withdrawn.checked_add(amount)
            .ok_or(VaultError::ArithmeticOverflow)?;

        msg!("User {} withdrew {} lamports", user.key(), amount);
        Ok(())
    }

    /// Admin function to recover stuck funds (emergency only)
    pub fn recover_funds(ctx: Context<RecoverFunds>, amount: u64) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.vault_state.authority,
            VaultError::UnauthorizedRecovery
        );

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.authority.to_account_info(),
                },
                &[&[b"vault", &[ctx.bumps.vault]]],
            ),
            amount,
        )?;

        msg!("Admin recovered {} lamports from vault", amount);
        Ok(())
    }
}

/// Initialize vault account context
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

/// Buy-in context (deposit)
#[derive(Accounts)]
pub struct BuyIn<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// Vault PDA that holds all deposited SOL - just an address, doesn't need to exist
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault: UncheckedAccount<'info>,
    
    /// Global vault state tracking total deposits/withdrawals
    #[account(
        mut,
        seeds = [b"vault-state"],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,
    
    /// Per-user state tracking individual balance
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

/// Leave table context (withdraw)
#[derive(Accounts)]
pub struct LeaveTable<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// Vault PDA that holds all deposited SOL
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault: UncheckedAccount<'info>,
    
    /// Global vault state tracking total deposits/withdrawals
    #[account(
        mut,
        seeds = [b"vault-state"],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,
    
    /// Per-user state tracking individual balance
    #[account(
        mut,
        seeds = [b"user-state", user.key().as_ref()],
        bump
    )]
    pub user_state: Account<'info, UserState>,
    
    pub system_program: Program<'info, System>,
}

/// Recovery context (admin emergency function)
#[derive(Accounts)]
pub struct RecoverFunds<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(
        seeds = [b"vault-state"],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,

    pub system_program: Program<'info, System>,
}

/// Global vault state
#[account]
#[derive(InitSpace)]
pub struct VaultState {
    pub authority: Pubkey,           // Admin wallet for emergency recovery
    pub total_deposited: u64,        // Total SOL deposited across all users
    pub total_withdrawn: u64,        // Total SOL withdrawn across all users
}

/// Per-user vault state
#[account]
#[derive(InitSpace)]
pub struct UserState {
    pub owner: Pubkey,               // User's wallet address
    pub balance: u64,                // User's current balance in vault
    pub last_deposit: i64,           // Timestamp of last deposit
    pub last_withdrawal: i64,        // Timestamp of last withdrawal
}

#[error_code]
pub enum VaultError {
    #[msg("Invalid amount: must be greater than 0")]
    InvalidAmount,

    #[msg("Insufficient balance in vault")]
    InsufficientBalance,

    #[msg("Unauthorized withdrawal: you do not own this account")]
    UnauthorizedWithdraw,

    #[msg("Unauthorized recovery: only admin can recover funds")]
    UnauthorizedRecovery,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Arithmetic underflow")]
    ArithmeticUnderflow,
}
