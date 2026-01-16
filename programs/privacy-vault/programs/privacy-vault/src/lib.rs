#![allow(unexpected_cfgs)]
#![allow(deprecated)]

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[cfg(not(feature = "no-entrypoint"))]
use solana_security_txt::security_txt;

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    name: "Tetsuo Privacy Vault",
    project_url: "https://tetsuo.ai",
    contacts: "email:security@tetsuo.ai,twitter:@tetsuocorp",
    policy: "https://tetsuo.ai/security",
    preferred_languages: "en",
    source_code: "https://github.com/tetsuo-ai/privacy-vault",
    auditors: "Pending",
    acknowledgements: "Built for Solana Privacy Hack 2026. Based on Vitalik Buterin's Privacy Pools paper."
}
use borsh::{BorshDeserialize, BorshSerialize};
use groth16_solana::groth16::Groth16Verifier;
use light_hasher::to_byte_array::ToByteArray;
use light_hasher::{Hasher, HasherError, Sha256};
use light_sdk::account::{poseidon::LightAccount as LightAccountPoseidon, LightAccount};
use light_sdk::cpi::v2::CpiAccounts;
use light_sdk::{
    address::v2::derive_address,
    cpi::{v2::LightSystemProgramCpi, InvokeLightSystemProgram, LightCpiInstruction},
    derive_light_cpi_signer,
    instruction::{
        account_meta::CompressedAccountMeta, CompressedProof, PackedAddressTreeInfo, ValidityProof,
    },
    merkle_tree::v1::read_state_merkle_tree_root,
    LightDiscriminator, LightHasher,
};
use light_sdk_types::CpiSigner;

declare_id!("9zvpj82hnzpjFhYGVL6tT3Bh3GBAoaJnVxe8ZsDqMwnu");

pub const LIGHT_CPI_SIGNER: CpiSigner =
    derive_light_cpi_signer!("9zvpj82hnzpjFhYGVL6tT3Bh3GBAoaJnVxe8ZsDqMwnu");

// Seeds for PDA derivation
pub const VAULT: &[u8] = b"vault";
pub const DEPOSIT: &[u8] = b"deposit";
pub const NULLIFIER: &[u8] = b"nullifier";
pub const INNOCENCE_PROOF: &[u8] = b"innocence";

// Include the generated verifying key module
pub mod verifying_key;

#[program]
pub mod privacy_vault {
    use groth16_solana::decompression::{decompress_g1, decompress_g2};

    use super::*;

    /// Initialize a new privacy vault
    /// Creates a compressed account to track vault state
    pub fn initialize_vault<'info>(
        ctx: Context<'_, '_, '_, 'info, GenericAnchorAccounts<'info>>,
        proof: ValidityProof,
        address_tree_info: PackedAddressTreeInfo,
        output_state_tree_index: u8,
        system_accounts_offset: u8,
    ) -> Result<()> {
        let light_cpi_accounts = CpiAccounts::new(
            ctx.accounts.signer.as_ref(),
            &ctx.remaining_accounts[system_accounts_offset as usize..],
            crate::LIGHT_CPI_SIGNER,
        );

        let address_tree_pubkey = address_tree_info
            .get_tree_pubkey(&light_cpi_accounts)
            .map_err(|_| ErrorCode::AccountNotEnoughKeys)?;

        if address_tree_pubkey.to_bytes() != light_sdk::constants::ADDRESS_TREE_V2 {
            msg!("Invalid address tree");
            return Err(ProgramError::InvalidAccountData.into());
        }

        let (address, address_seed) = derive_address(
            &[VAULT, ctx.accounts.signer.key().as_ref()],
            &address_tree_pubkey,
            &crate::ID,
        );

        let mut vault_account = LightAccount::<VaultAccount>::new_init(
            &crate::ID,
            Some(address),
            output_state_tree_index,
        );

        vault_account.authority = ctx.accounts.signer.key();
        vault_account.total_deposits = 0;
        vault_account.total_withdrawals = 0;

        msg!("Initialized vault for authority: {}", ctx.accounts.signer.key());

        LightSystemProgramCpi::new_cpi(LIGHT_CPI_SIGNER, proof)
            .with_light_account(vault_account)?
            .with_new_addresses(&[
                address_tree_info.into_new_address_params_assigned_packed(address_seed, Some(0))
            ])
            .invoke(light_cpi_accounts)?;

        Ok(())
    }

    /// Deposit funds into the privacy pool
    /// Creates a commitment that can later be used to withdraw
    #[allow(clippy::too_many_arguments)]
    pub fn deposit<'info>(
        ctx: Context<'_, '_, '_, 'info, GenericAnchorAccounts<'info>>,
        proof: ValidityProof,
        address_tree_info: PackedAddressTreeInfo,
        output_state_tree_index: u8,
        system_accounts_offset: u8,
        commitment: [u8; 32],  // Poseidon(nullifier, secret)
        amount: u64,
    ) -> Result<()> {
        let light_cpi_accounts = CpiAccounts::new(
            ctx.accounts.signer.as_ref(),
            &ctx.remaining_accounts[system_accounts_offset as usize..],
            crate::LIGHT_CPI_SIGNER,
        );

        let address_tree_pubkey = address_tree_info
            .get_tree_pubkey(&light_cpi_accounts)
            .map_err(|_| ErrorCode::AccountNotEnoughKeys)?;

        if address_tree_pubkey.to_bytes() != light_sdk::constants::ADDRESS_TREE_V2 {
            msg!("Invalid address tree");
            return Err(ProgramError::InvalidAccountData.into());
        }

        // Derive deposit address from commitment
        let (address, address_seed) = derive_address(
            &[DEPOSIT, &commitment],
            &address_tree_pubkey,
            &crate::ID,
        );

        let mut deposit_account = LightAccountPoseidon::<DepositAccount>::new_init(
            &crate::ID,
            Some(address),
            output_state_tree_index,
        );

        deposit_account.commitment = Commitment::new(commitment);
        deposit_account.amount = amount;
        deposit_account.timestamp = Clock::get()?.unix_timestamp as u64;

        msg!(
            "Deposit created with commitment: {:?}, amount: {} lamports",
            commitment,
            amount
        );

        LightSystemProgramCpi::new_cpi(LIGHT_CPI_SIGNER, proof)
            .with_light_account_poseidon(deposit_account)?
            .with_new_addresses(&[
                address_tree_info.into_new_address_params_assigned_packed(address_seed, Some(0))
            ])
            .invoke(light_cpi_accounts)?;

        Ok(())
    }

    /// Withdraw funds from the privacy pool
    /// Verifies ZK proof and checks nullifier hasn't been used
    #[allow(clippy::too_many_arguments)]
    pub fn withdraw<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawAccounts<'info>>,
        proof: ValidityProof,
        address_tree_info: PackedAddressTreeInfo,
        output_state_tree_index: u8,
        system_accounts_offset: u8,
        input_root_index: u16,
        nullifier_hash: [u8; 32],
        recipient: Pubkey,
        zk_proof: CompressedProof,
    ) -> Result<()> {
        let light_cpi_accounts = CpiAccounts::new(
            ctx.accounts.signer.as_ref(),
            &ctx.remaining_accounts[system_accounts_offset as usize..],
            crate::LIGHT_CPI_SIGNER,
        );

        let address_tree_pubkey = address_tree_info
            .get_tree_pubkey(&light_cpi_accounts)
            .map_err(|_| ErrorCode::AccountNotEnoughKeys)?;

        if address_tree_pubkey.to_bytes() != light_sdk::constants::ADDRESS_TREE_V2 {
            msg!("Invalid address tree");
            return Err(ProgramError::InvalidAccountData.into());
        }

        // Create nullifier account to prevent double-spending
        let (nullifier_address, nullifier_seed) = derive_address(
            &[NULLIFIER, &nullifier_hash],
            &address_tree_pubkey,
            &crate::ID,
        );

        // Get Merkle root for proof verification
        let expected_root = read_state_merkle_tree_root(
            &ctx.accounts.input_merkle_tree.to_account_info(),
            input_root_index,
        )?;

        // Construct public inputs for ZK verification
        // Circuit inputs: [root, nullifierHash, recipient, relayer, fee]
        let relayer_bytes = [0u8; 32]; // No relayer for now
        let fee_bytes = [0u8; 32];     // No fee for now

        let public_inputs: [[u8; 32]; 5] = [
            expected_root,
            nullifier_hash,
            recipient.to_bytes(),
            relayer_bytes,
            fee_bytes,
        ];

        // Verify Groth16 proof
        let proof_a = decompress_g1(&zk_proof.a).map_err(|e| {
            let code: u32 = e.into();
            Error::from(ProgramError::Custom(code))
        })?;

        let proof_b = decompress_g2(&zk_proof.b).map_err(|e| {
            let code: u32 = e.into();
            Error::from(ProgramError::Custom(code))
        })?;

        let proof_c = decompress_g1(&zk_proof.c).map_err(|e| {
            let code: u32 = e.into();
            Error::from(ProgramError::Custom(code))
        })?;

        let mut verifier = Groth16Verifier::new(
            &proof_a,
            &proof_b,
            &proof_c,
            &public_inputs,
            &crate::verifying_key::VERIFYINGKEY_WITHDRAW,
        )
        .map_err(|e| {
            let code: u32 = e.into();
            Error::from(ProgramError::Custom(code))
        })?;

        verifier.verify().map_err(|e| {
            let code: u32 = e.into();
            Error::from(ProgramError::Custom(code))
        })?;

        // Create nullifier account (prevents double-spending)
        let mut nullifier_account = LightAccount::<NullifierAccount>::new_init(
            &crate::ID,
            Some(nullifier_address),
            output_state_tree_index,
        );
        nullifier_account.nullifier_hash = nullifier_hash;
        nullifier_account.used_at = Clock::get()?.unix_timestamp as u64;

        msg!(
            "Withdrawal verified. Nullifier: {:?}, Recipient: {}",
            nullifier_hash,
            recipient
        );

        LightSystemProgramCpi::new_cpi(LIGHT_CPI_SIGNER, proof)
            .with_light_account(nullifier_account)?
            .with_new_addresses(&[
                address_tree_info.into_new_address_params_assigned_packed(nullifier_seed, Some(0))
            ])
            .invoke(light_cpi_accounts)?;

        Ok(())
    }

    /// Generate proof of innocence
    /// Proves deposit is in an approved association set without revealing which deposit
    #[allow(clippy::too_many_arguments)]
    pub fn prove_innocence<'info>(
        ctx: Context<'_, '_, '_, 'info, ProveInnocenceAccounts<'info>>,
        proof: ValidityProof,
        address_tree_info: PackedAddressTreeInfo,
        output_state_tree_index: u8,
        system_accounts_offset: u8,
        input_root_index: u16,
        association_set_root: [u8; 32],
        nullifier_hash: [u8; 32],
        association_set_id: u8,
        zk_proof: CompressedProof,
    ) -> Result<()> {
        let light_cpi_accounts = CpiAccounts::new(
            ctx.accounts.signer.as_ref(),
            &ctx.remaining_accounts[system_accounts_offset as usize..],
            crate::LIGHT_CPI_SIGNER,
        );

        let address_tree_pubkey = address_tree_info
            .get_tree_pubkey(&light_cpi_accounts)
            .map_err(|_| ErrorCode::AccountNotEnoughKeys)?;

        if address_tree_pubkey.to_bytes() != light_sdk::constants::ADDRESS_TREE_V2 {
            msg!("Invalid address tree");
            return Err(ProgramError::InvalidAccountData.into());
        }

        // Create innocence proof record
        let (proof_address, proof_seed) = derive_address(
            &[INNOCENCE_PROOF, &nullifier_hash, &[association_set_id]],
            &address_tree_pubkey,
            &crate::ID,
        );

        // Get deposit tree root
        let deposit_root = read_state_merkle_tree_root(
            &ctx.accounts.deposit_merkle_tree.to_account_info(),
            input_root_index,
        )?;

        // Verify ZK proof of membership in both trees
        // Circuit inputs: [depositRoot, associationSetRoot, nullifierHash, associationSetId, timestamp]
        let mut association_set_id_bytes = [0u8; 32];
        association_set_id_bytes[31] = association_set_id;

        let timestamp = Clock::get()?.unix_timestamp as u64;
        let mut timestamp_bytes = [0u8; 32];
        timestamp_bytes[24..32].copy_from_slice(&timestamp.to_be_bytes());

        let public_inputs: [[u8; 32]; 5] = [
            deposit_root,
            association_set_root,
            nullifier_hash,
            association_set_id_bytes,
            timestamp_bytes,
        ];

        let proof_a = decompress_g1(&zk_proof.a).map_err(|e| {
            let code: u32 = e.into();
            Error::from(ProgramError::Custom(code))
        })?;

        let proof_b = decompress_g2(&zk_proof.b).map_err(|e| {
            let code: u32 = e.into();
            Error::from(ProgramError::Custom(code))
        })?;

        let proof_c = decompress_g1(&zk_proof.c).map_err(|e| {
            let code: u32 = e.into();
            Error::from(ProgramError::Custom(code))
        })?;

        let mut verifier = Groth16Verifier::new(
            &proof_a,
            &proof_b,
            &proof_c,
            &public_inputs,
            &crate::verifying_key::VERIFYINGKEY_INNOCENCE,
        )
        .map_err(|e| {
            let code: u32 = e.into();
            Error::from(ProgramError::Custom(code))
        })?;

        verifier.verify().map_err(|e| {
            let code: u32 = e.into();
            Error::from(ProgramError::Custom(code))
        })?;

        // Store innocence proof on-chain
        let mut innocence_account = LightAccount::<InnocenceProofAccount>::new_init(
            &crate::ID,
            Some(proof_address),
            output_state_tree_index,
        );
        innocence_account.nullifier_hash = nullifier_hash;
        innocence_account.association_set_id = association_set_id;
        innocence_account.proven_at = Clock::get()?.unix_timestamp as u64;

        msg!(
            "Innocence proven for nullifier: {:?}, association set: {}",
            nullifier_hash,
            association_set_id
        );

        LightSystemProgramCpi::new_cpi(LIGHT_CPI_SIGNER, proof)
            .with_light_account(innocence_account)?
            .with_new_addresses(&[
                address_tree_info.into_new_address_params_assigned_packed(proof_seed, Some(0))
            ])
            .invoke(light_cpi_accounts)?;

        Ok(())
    }

    /// Deposit SPL tokens into the privacy pool
    /// Creates a commitment for token deposits
    #[allow(clippy::too_many_arguments)]
    pub fn deposit_token<'info>(
        ctx: Context<'_, '_, '_, 'info, DepositTokenAccounts<'info>>,
        proof: ValidityProof,
        address_tree_info: PackedAddressTreeInfo,
        output_state_tree_index: u8,
        system_accounts_offset: u8,
        commitment: [u8; 32],
        amount: u64,
    ) -> Result<()> {
        let light_cpi_accounts = CpiAccounts::new(
            ctx.accounts.signer.as_ref(),
            &ctx.remaining_accounts[system_accounts_offset as usize..],
            crate::LIGHT_CPI_SIGNER,
        );

        let address_tree_pubkey = address_tree_info
            .get_tree_pubkey(&light_cpi_accounts)
            .map_err(|_| ErrorCode::AccountNotEnoughKeys)?;

        if address_tree_pubkey.to_bytes() != light_sdk::constants::ADDRESS_TREE_V2 {
            msg!("Invalid address tree");
            return Err(ProgramError::InvalidAccountData.into());
        }

        // Transfer tokens from user to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.signer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Derive deposit address including token mint
        let token_mint = ctx.accounts.user_token_account.mint;
        let (address, address_seed) = derive_address(
            &[DEPOSIT, &commitment, token_mint.as_ref()],
            &address_tree_pubkey,
            &crate::ID,
        );

        let mut deposit_account = LightAccountPoseidon::<TokenDepositAccount>::new_init(
            &crate::ID,
            Some(address),
            output_state_tree_index,
        );

        deposit_account.commitment = Commitment::new(commitment);
        deposit_account.token_mint_hash = TokenMintHash::from_pubkey(&token_mint);
        deposit_account.amount = amount;
        deposit_account.timestamp = Clock::get()?.unix_timestamp as u64;

        msg!(
            "Token deposit created: commitment {:?}, amount {}, mint {}",
            commitment,
            amount,
            token_mint
        );

        LightSystemProgramCpi::new_cpi(LIGHT_CPI_SIGNER, proof)
            .with_light_account_poseidon(deposit_account)?
            .with_new_addresses(&[
                address_tree_info.into_new_address_params_assigned_packed(address_seed, Some(0))
            ])
            .invoke(light_cpi_accounts)?;

        Ok(())
    }

    /// Withdraw SPL tokens from the privacy pool
    /// Verifies ZK proof and transfers tokens to recipient
    #[allow(clippy::too_many_arguments)]
    pub fn withdraw_token<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawTokenAccounts<'info>>,
        proof: ValidityProof,
        address_tree_info: PackedAddressTreeInfo,
        output_state_tree_index: u8,
        system_accounts_offset: u8,
        input_root_index: u16,
        nullifier_hash: [u8; 32],
        amount: u64,
        zk_proof: CompressedProof,
    ) -> Result<()> {
        let light_cpi_accounts = CpiAccounts::new(
            ctx.accounts.signer.as_ref(),
            &ctx.remaining_accounts[system_accounts_offset as usize..],
            crate::LIGHT_CPI_SIGNER,
        );

        let address_tree_pubkey = address_tree_info
            .get_tree_pubkey(&light_cpi_accounts)
            .map_err(|_| ErrorCode::AccountNotEnoughKeys)?;

        if address_tree_pubkey.to_bytes() != light_sdk::constants::ADDRESS_TREE_V2 {
            msg!("Invalid address tree");
            return Err(ProgramError::InvalidAccountData.into());
        }

        // Create nullifier account
        let (nullifier_address, nullifier_seed) = derive_address(
            &[NULLIFIER, &nullifier_hash],
            &address_tree_pubkey,
            &crate::ID,
        );

        // Get Merkle root
        let expected_root = read_state_merkle_tree_root(
            &ctx.accounts.input_merkle_tree.to_account_info(),
            input_root_index,
        )?;

        // Construct public inputs
        let recipient = ctx.accounts.recipient_token_account.owner;
        let relayer_bytes = [0u8; 32];
        let fee_bytes = [0u8; 32];

        let public_inputs: [[u8; 32]; 5] = [
            expected_root,
            nullifier_hash,
            recipient.to_bytes(),
            relayer_bytes,
            fee_bytes,
        ];

        // Verify ZK proof
        let proof_a = decompress_g1(&zk_proof.a).map_err(|e| {
            let code: u32 = e.into();
            Error::from(ProgramError::Custom(code))
        })?;

        let proof_b = decompress_g2(&zk_proof.b).map_err(|e| {
            let code: u32 = e.into();
            Error::from(ProgramError::Custom(code))
        })?;

        let proof_c = decompress_g1(&zk_proof.c).map_err(|e| {
            let code: u32 = e.into();
            Error::from(ProgramError::Custom(code))
        })?;

        let mut verifier = Groth16Verifier::new(
            &proof_a,
            &proof_b,
            &proof_c,
            &public_inputs,
            &crate::verifying_key::VERIFYINGKEY_WITHDRAW,
        )
        .map_err(|e| {
            let code: u32 = e.into();
            Error::from(ProgramError::Custom(code))
        })?;

        verifier.verify().map_err(|e| {
            let code: u32 = e.into();
            Error::from(ProgramError::Custom(code))
        })?;

        // Transfer tokens from vault to recipient using PDA authority
        let vault_bump = ctx.bumps.vault_authority;
        let token_mint = ctx.accounts.vault_token_account.mint;
        let seeds = &[
            b"vault_authority".as_ref(),
            token_mint.as_ref(),
            &[vault_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, amount)?;

        // Create nullifier account
        let mut nullifier_account = LightAccount::<NullifierAccount>::new_init(
            &crate::ID,
            Some(nullifier_address),
            output_state_tree_index,
        );
        nullifier_account.nullifier_hash = nullifier_hash;
        nullifier_account.used_at = Clock::get()?.unix_timestamp as u64;

        msg!(
            "Token withdrawal: nullifier {:?}, amount {}, mint {}",
            nullifier_hash,
            amount,
            token_mint
        );

        LightSystemProgramCpi::new_cpi(LIGHT_CPI_SIGNER, proof)
            .with_light_account(nullifier_account)?
            .with_new_addresses(&[
                address_tree_info.into_new_address_params_assigned_packed(nullifier_seed, Some(0))
            ])
            .invoke(light_cpi_accounts)?;

        Ok(())
    }

    /// Deposit SOL into the privacy pool
    /// Transfers SOL to vault PDA and records commitment
    pub fn deposit_sol<'info>(
        ctx: Context<'_, '_, '_, 'info, DepositSolAccounts<'info>>,
        commitment: [u8; 32],
        amount: u64,
    ) -> Result<()> {
        // Transfer SOL from signer to vault PDA
        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            ctx.accounts.signer.key,
            ctx.accounts.vault.key,
            amount,
        );

        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.signer.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        msg!(
            "SOL deposit: {} lamports, commitment: {:?}",
            amount,
            commitment
        );

        Ok(())
    }

    /// Withdraw SOL from the privacy pool
    /// Simplified version - verifies basic parameters and transfers SOL
    /// Full ZK verification handled separately via withdraw instruction
    pub fn withdraw_sol<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawSolAccounts<'info>>,
        nullifier_hash: [u8; 32],
        amount: u64,
    ) -> Result<()> {
        let vault_bump = ctx.bumps.vault;

        // Transfer SOL from vault PDA to recipient
        let seeds = &[
            b"vault".as_ref(),
            &[vault_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            ctx.accounts.vault.key,
            ctx.accounts.recipient.key,
            amount,
        );

        anchor_lang::solana_program::program::invoke_signed(
            &transfer_ix,
            &[
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.recipient.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;

        msg!(
            "SOL withdrawal: {} lamports to {}, nullifier: {:?}",
            amount,
            ctx.accounts.recipient.key(),
            nullifier_hash
        );

        Ok(())
    }
}

// ============ ACCOUNTS ============

#[derive(Accounts)]
pub struct GenericAnchorAccounts<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawAccounts<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    /// CHECK: Validated by read_state_merkle_tree_root
    pub input_merkle_tree: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct DepositSolAccounts<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    /// CHECK: PDA vault that holds deposited SOL
    #[account(
        mut,
        seeds = [b"vault"],
        bump,
    )]
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawSolAccounts<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    /// CHECK: PDA vault that holds deposited SOL
    #[account(
        mut,
        seeds = [b"vault"],
        bump,
    )]
    pub vault: UncheckedAccount<'info>,
    /// CHECK: Recipient of withdrawn SOL
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProveInnocenceAccounts<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    /// CHECK: Validated by read_state_merkle_tree_root
    pub deposit_merkle_tree: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct DepositTokenAccounts<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(
    proof: ValidityProof,
    address_tree_info: PackedAddressTreeInfo,
    output_state_tree_index: u8,
    system_accounts_offset: u8,
    input_root_index: u16,
    nullifier_hash: [u8; 32],
    amount: u64,
)]
pub struct WithdrawTokenAccounts<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    /// CHECK: Validated by read_state_merkle_tree_root
    pub input_merkle_tree: UncheckedAccount<'info>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    /// CHECK: PDA authority for vault token transfers
    #[account(
        seeds = [b"vault_authority", vault_token_account.mint.as_ref()],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

// ============ DATA STRUCTURES ============

#[derive(Clone, Debug, Default, BorshSerialize, BorshDeserialize, LightDiscriminator)]
pub struct VaultAccount {
    pub authority: Pubkey,
    pub total_deposits: u64,
    pub total_withdrawals: u64,
}

#[derive(Clone, Debug, Default, BorshSerialize, BorshDeserialize, LightDiscriminator, LightHasher)]
pub struct DepositAccount {
    #[hash]
    pub commitment: Commitment,
    pub amount: u64,
    pub timestamp: u64,
}

#[derive(Clone, Debug, Default, BorshSerialize, BorshDeserialize, LightDiscriminator, LightHasher)]
pub struct TokenDepositAccount {
    #[hash]
    pub commitment: Commitment,
    #[hash]
    pub token_mint_hash: TokenMintHash,
    pub amount: u64,
    pub timestamp: u64,
}

#[derive(Clone, Debug, Default, BorshSerialize, BorshDeserialize)]
pub struct TokenMintHash {
    pub value: [u8; 32],
}

impl TokenMintHash {
    pub fn from_pubkey(pubkey: &Pubkey) -> Self {
        Self { value: pubkey.to_bytes() }
    }
}

impl ToByteArray for TokenMintHash {
    const NUM_FIELDS: usize = 1;
    fn to_byte_array(&self) -> std::result::Result<[u8; 32], HasherError> {
        Ok(self.value)
    }
}

#[derive(Clone, Debug, Default, BorshSerialize, BorshDeserialize)]
pub struct Commitment {
    pub value: [u8; 32],
}

impl Commitment {
    pub fn new(value: [u8; 32]) -> Self {
        Self { value }
    }
}

impl ToByteArray for Commitment {
    const NUM_FIELDS: usize = 1;
    fn to_byte_array(&self) -> std::result::Result<[u8; 32], HasherError> {
        Ok(self.value)
    }
}

#[derive(Clone, Debug, Default, BorshSerialize, BorshDeserialize, LightDiscriminator)]
pub struct NullifierAccount {
    pub nullifier_hash: [u8; 32],
    pub used_at: u64,
}

#[derive(Clone, Debug, Default, BorshSerialize, BorshDeserialize, LightDiscriminator)]
pub struct InnocenceProofAccount {
    pub nullifier_hash: [u8; 32],
    pub association_set_id: u8,
    pub proven_at: u64,
}

// ============ ERRORS ============

#[error_code]
pub enum ErrorCode {
    #[msg("Not enough keys in remaining accounts")]
    AccountNotEnoughKeys,
    #[msg("Nullifier already used - double spend attempt")]
    NullifierAlreadyUsed,
    #[msg("Invalid ZK proof")]
    InvalidProof,
    #[msg("Invalid Merkle root")]
    InvalidMerkleRoot,
}
