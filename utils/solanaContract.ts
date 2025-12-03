import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { SOL_POKER_PROGRAM_ID } from '../constants';

// --- ANCHOR CONSTANTS ---
// These must match the Rust Contract "seeds" exactly
const VAULT_SEED = "vault";
const USER_STATE_SEED = "user-state";

// Helper to derive the Vault Address (PDA)
export const getVaultAddress = async () => {
    const programId = new PublicKey(SOL_POKER_PROGRAM_ID);
    const [vaultPda] = await PublicKey.findProgramAddress(
        [Buffer.from(VAULT_SEED)],
        programId
    );
    return vaultPda;
};

// Helper to derive User State Address (PDA) - Tracks individual balances on-chain
export const getUserStateAddress = async (userPubkey: PublicKey) => {
    const programId = new PublicKey(SOL_POKER_PROGRAM_ID);
    const [userStatePda] = await PublicKey.findProgramAddress(
        [Buffer.from(USER_STATE_SEED), userPubkey.toBuffer()],
        programId
    );
    return userStatePda;
};

// Anchor Discriminator Calculator
// Anchor calculates a unique 8-byte identifier for every function based on its name.
// sha256("global:function_name").slice(0, 8)
async function getAnchorDiscriminator(instructionName: string): Promise<Buffer> {
    const encoder = new TextEncoder();
    const preimage = `global:${instructionName}`;
    const data = encoder.encode(preimage);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Buffer.from(hashBuffer).slice(0, 8);
}

// 1. BUY IN (Deposit)
export const createBuyInInstruction = async (
    playerPublicKey: PublicKey,
    amountSol: number // Changed from amountChips - this is SOL amount
): Promise<TransactionInstruction> => {
    const programId = new PublicKey(SOL_POKER_PROGRAM_ID);
    const vaultPda = await getVaultAddress();
    const userStatePda = await getUserStateAddress(playerPublicKey);

    // Function Name in Rust: "buy_in"
    const discriminator = await getAnchorDiscriminator("buy_in");

    // Convert SOL to lamports
    const amountLamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));
    
    // Data Layout: [Discriminator (8 bytes)] + [Amount (8 bytes)]
    const dataBuffer = Buffer.alloc(16);
    discriminator.copy(dataBuffer, 0);
    // Write u64 Little Endian
    dataBuffer.writeBigUInt64LE(amountLamports, 8);

    console.log("[Contract Security] Creating BuyIn Instruction", {
        user: playerPublicKey.toBase58(),
        vault: vaultPda.toBase58(),
        userState: userStatePda.toBase58(),
        amountSol: amountSol,
        lamports: amountLamports.toString()
    });

    return new TransactionInstruction({
        keys: [
            { pubkey: playerPublicKey, isSigner: true, isWritable: true }, // user
            { pubkey: vaultPda, isSigner: false, isWritable: true },       // vault
            { pubkey: userStatePda, isSigner: false, isWritable: true },   // user_state
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false } // system_program
        ],
        programId: programId,
        data: dataBuffer
    });
};

// 2. LEAVE TABLE (Withdraw)
export const createLeaveTableInstruction = async (
    playerPublicKey: PublicKey,
    amountSol: number // Changed from amountChips - this is SOL amount
): Promise<TransactionInstruction> => {
    const programId = new PublicKey(SOL_POKER_PROGRAM_ID);
    const vaultPda = await getVaultAddress();
    const userStatePda = await getUserStateAddress(playerPublicKey);

    // Function Name in Rust: "leave_table"
    const discriminator = await getAnchorDiscriminator("leave_table");

    // Convert SOL to lamports
    const amountLamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));

    // Data Layout: [Discriminator (8 bytes)] + [Amount (8 bytes)]
    const dataBuffer = Buffer.alloc(16);
    discriminator.copy(dataBuffer, 0);
    dataBuffer.writeBigUInt64LE(amountLamports, 8);

    console.log("[Contract Security] Creating Withdraw Instruction", {
        user: playerPublicKey.toBase58(),
        amountSol: amountSol,
        lamports: amountLamports.toString()
    });

    return new TransactionInstruction({
        keys: [
            { pubkey: playerPublicKey, isSigner: true, isWritable: true }, // user
            { pubkey: vaultPda, isSigner: false, isWritable: true },       // vault
            { pubkey: userStatePda, isSigner: false, isWritable: true },   // user_state
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false } // system_program
        ],
        programId: programId,
        data: dataBuffer
    });
};

// --- EXECUTION HELPERS ---

export const depositToVault = async (
    connection: Connection,
    sendTransaction: any,
    publicKey: PublicKey,
    amount: number
) => {
    if (!publicKey) throw new Error("Wallet not connected");

    try {
        const instruction = await createBuyInInstruction(publicKey, amount);
        const transaction = new Transaction().add(instruction);
        
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        // Use sendTransaction from useWallet hook
        const signature = await sendTransaction(transaction, connection, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });
        
        console.log(`[Chain] Deposit TX Sent: ${signature}`);
        
        // Wait for confirmation with timeout
        const confirmationStrategy = {
            signature,
            blockhash,
            lastValidBlockHeight
        };
        
        const confirmation = await connection.confirmTransaction(confirmationStrategy, 'confirmed');

        if (confirmation.value.err) {
            console.error("Deposit Confirmation Error:", confirmation.value.err);
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        return signature;
    } catch (e: any) {
        // Pass the error message back cleanly
        console.error("Deposit Error Details:", e);
        console.error("Error name:", e.name);
        console.error("Error message:", e.message);
        console.error("Error stack:", e.stack);
        if (e.logs) console.error("Transaction logs:", e.logs);
        throw new Error(e.message || "Deposit failed. Please check console for details.");
    }
};

export const withdrawFromVault = async (
    connection: Connection,
    sendTransaction: any,
    publicKey: PublicKey,
    amount: number
) => {
    if (!publicKey) throw new Error("Wallet not connected");

    try {
        const instruction = await createLeaveTableInstruction(publicKey, amount);
        const transaction = new Transaction().add(instruction);
        
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        // Use sendTransaction from useWallet hook
        const signature = await sendTransaction(transaction, connection, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });
        
        console.log(`[Chain] Withdraw TX Sent: ${signature}`);
        
        // Wait for confirmation with timeout
        const confirmationStrategy = {
            signature,
            blockhash,
            lastValidBlockHeight
        };
        
        const confirmation = await connection.confirmTransaction(confirmationStrategy, 'confirmed');

        if (confirmation.value.err) {
            console.error("Withdraw Confirmation Error:", confirmation.value.err);
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        return signature;
    } catch (e: any) {
        console.error("Withdraw Error Details:", e);
        throw e;
    }
};