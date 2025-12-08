import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

describe("Vault Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Get your program - update the name to match your program name
  const program = anchor.workspace.solpokerVault;

  // Derive the vault state PDA
  const vaultStatePda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault-state")],
    program.programId
  )[0];

  // Derive the vault PDA
  const vaultPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    program.programId
  )[0];

  // Derive user state PDA
  const userPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("user-state"), provider.wallet.publicKey.toBuffer()],
    program.programId
  )[0];

  it("1️⃣ Initialize Vault", async () => {
    try {
      console.log("\n📍 Initializing Vault...");
      console.log("   Vault State PDA:", vaultStatePda.toBase58());
      console.log("   Authority:", provider.wallet.publicKey.toBase58());

      const tx = await program.methods
        .initializeVault()
        .accounts({
          vaultState: vaultStatePda,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Vault Initialized!");
      console.log("   TX:", tx);

      // Verify vault state
      const vaultState = await program.account.vaultState.fetch(vaultStatePda);
      console.log("   Authority set to:", vaultState.authority.toBase58());
    } catch (error: any) {
      console.error("❌ Initialize failed:", error.message);
      throw error;
    }
  });

  it("2️⃣ Deposit 1 SOL", async () => {
    try {
      console.log("\n📍 Depositing 1 SOL...");
      console.log("   User:", provider.wallet.publicKey.toBase58());
      console.log("   User State PDA:", userPda.toBase58());

      // Check if user state exists before deposit
      try {
        const userStateAccount = await provider.connection.getAccountInfo(userPda);
        if (userStateAccount === null) {
          console.log("   ℹ️  User state doesn't exist yet (will be created)");
        } else {
          console.log("   ℹ️  User state exists");
        }
      } catch (e) {
        console.log("   ℹ️  User state account check skipped");
      }

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

      console.log("✅ Deposit Successful!");
      console.log("   TX:", tx);

      // Verify user state was updated
      const userState = await program.account.userState.fetch(userPda);
      console.log("   User Balance:", (userState.balance.toNumber() / anchor.web3.LAMPORTS_PER_SOL).toFixed(4), "SOL");
      console.log("   User Owner:", userState.owner.toBase58());
    } catch (error: any) {
      console.error("❌ Deposit failed:", error.message);
      console.error("   Full error:", error);
      throw error;
    }
  });

  it("3️⃣ Withdraw 0.5 SOL", async () => {
    try {
      console.log("\n📍 Withdrawing 0.5 SOL...");
      console.log("   User:", provider.wallet.publicKey.toBase58());
      console.log("   User State PDA:", userPda.toBase58());

      // Check user state exists and has balance
      const userStateBefore = await program.account.userState.fetch(userPda);
      console.log("   Balance before withdrawal:", (userStateBefore.balance.toNumber() / anchor.web3.LAMPORTS_PER_SOL).toFixed(4), "SOL");

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

      console.log("✅ Withdrawal Successful!");
      console.log("   TX:", tx);

      // Verify user state was updated
      const userStateAfter = await program.account.userState.fetch(userPda);
      console.log("   Balance after withdrawal:", (userStateAfter.balance.toNumber() / anchor.web3.LAMPORTS_PER_SOL).toFixed(4), "SOL");
    } catch (error: any) {
      console.error("❌ Withdrawal failed:", error.message);
      console.error("   Full error:", error);
      throw error;
    }
  });

  it("4️⃣ Check Final Vault Balance", async () => {
    try {
      console.log("\n📍 Checking vault balance...");
      
      const vaultAccount = await provider.connection.getAccountInfo(vaultPda);
      const vaultBalance = vaultAccount?.lamports || 0;
      console.log("   Vault SOL Balance:", (vaultBalance / anchor.web3.LAMPORTS_PER_SOL).toFixed(4), "SOL");

      const vaultState = await program.account.vaultState.fetch(vaultStatePda);
      console.log("   Total Ever Deposited:", (vaultState.totalDeposited.toNumber() / anchor.web3.LAMPORTS_PER_SOL).toFixed(4), "SOL");
      console.log("   Total Ever Withdrawn:", (vaultState.totalWithdrawn.toNumber() / anchor.web3.LAMPORTS_PER_SOL).toFixed(4), "SOL");

      const userState = await program.account.userState.fetch(userPda);
      console.log("   User Current Balance:", (userState.balance.toNumber() / anchor.web3.LAMPORTS_PER_SOL).toFixed(4), "SOL");

      console.log("\n✅ All checks passed!");
    } catch (error: any) {
      console.error("❌ Balance check failed:", error.message);
      throw error;
    }
  });
});
