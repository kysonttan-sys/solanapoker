use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("EFeDTG6X5sMYHdck49zLhFxD2iKqJtiZSDL5f2oHMea2");

#[program]
pub mod solpoker_vault {
    use super::*;

    /// Deposit SOL into the vault (buy in)
    pub fn buy_in(ctx: Context<BuyIn>, amount: u64) -> Result<()> {
        let user = &ctx.accounts.user;
        let vault = &ctx.accounts.vault;
        let user_state = &mut ctx.accounts.user_state;

        // Transfer SOL from user to vault
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: user.to_account_info(),
                    to: vault.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update user state
        user_state.balance = user_state.balance.checked_add(amount).unwrap();
        user_state.owner = user.key();

        msg!("Deposited {} lamports to vault", amount);
        Ok(())
    }

    /// Withdraw SOL from the vault (leave table)
    pub fn leave_table(ctx: Context<LeaveTable>, amount: u64) -> Result<()> {
        let user_state = &mut ctx.accounts.user_state;
        let user = &ctx.accounts.user;
        let vault = &ctx.accounts.vault;

        // Check user has sufficient balance
        require!(
            user_state.balance >= amount,
            ErrorCode::InsufficientBalance
        );

        // Transfer SOL from vault to user
        **vault.to_account_info().try_borrow_mut_lamports()? -= amount;
        **user.to_account_info().try_borrow_mut_lamports()? += amount;

        // Update user state
        user_state.balance = user_state.balance.checked_sub(amount).unwrap();

        msg!("Withdrew {} lamports from vault", amount);
        Ok(())
    }
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
    pub vault: SystemAccount<'info>,
    
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
    pub vault: SystemAccount<'info>,
    
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
pub struct UserState {
    pub owner: Pubkey,
    pub balance: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient balance for withdrawal")]
    InsufficientBalance,
}
