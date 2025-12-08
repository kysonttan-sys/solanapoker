// ⚠️ Copy this code into Solana Playground's test area
// This is a test to initialize your vault

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolpokerVault } from "../target/types/solpoker_vault";

describe("Vault Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SolpokerVault as Program<SolpokerVault>;

  const vaultStatePda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault-state")],
    program.programId
  )[0];

  const vaultPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    program.programId
  )[0];

  it("Initialize Vault", async () => {
    const tx = await program.methods
      .initializeVault()
      .accounts({
        vaultState: vaultStatePda,
        vault: vaultPda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Vault Initialized. TX:", tx);
  });

  it("Buy In (Deposit 1 SOL)", async () => {
    const userPda = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user-state"), provider.wallet.publicKey.toBuffer()],
      program.programId
    )[0];

    const tx = await program.methods
      .buyIn(new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL))
      .accounts({
        user: provider.wallet.publicKey,
        vault: vaultPda,
        vaultState: vaultStatePda,
        userState: userPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Deposit Successful. TX:", tx);
  });

  it("Leave Table (Withdraw 0.5 SOL)", async () => {
    const userPda = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user-state"), provider.wallet.publicKey.toBuffer()],
      program.programId
    )[0];

    const tx = await program.methods
      .leaveTable(new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL))
      .accounts({
        user: provider.wallet.publicKey,
        vault: vaultPda,
        vaultState: vaultStatePda,
        userState: userPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Withdrawal Successful. TX:", tx);
  });
});
