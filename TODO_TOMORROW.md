# 📋 TODO LIST - Tomorrow (December 12, 2025)

## 🚨 CRITICAL - Must Fix First

### 1. **Security: Remove .env from Git Tracking**
**Priority:** URGENT ⚠️
**Time:** 5 minutes

```bash
# Remove from git (keeps local file)
git rm --cached server/.env

# Verify it's in .gitignore (already there)
cat .gitignore | grep .env

# Commit the removal
git commit -m "chore: remove .env from version control (security)"
```

**Why:** Your Supabase database password is exposed in git!

---

### 2. **Remove Tournament References from Pages**
**Priority:** HIGH 🔴
**Time:** 15-20 minutes

**Files to Fix:**
- `pages/Home.tsx` (Lines: 6, 15, 61-63, 205, 260, 280, 301-309)
- `pages/Lobby.tsx` (Lines: 5-6, 12, 42, 75, 116, 144-150)

**What to do:**
1. Remove `Tournament` from imports
2. Remove `tournaments` prop from interface
3. Remove tournament tab button
4. Remove tournament card rendering
5. Update Create button to only show Cash/Fun options

**Example Fix for Home.tsx:**
```typescript
// BEFORE
import { GameType, PokerTable, Tournament } from '../types';
interface HomeProps {
  tournaments: Tournament[];
}

// AFTER
import { GameType, PokerTable } from '../types';
interface HomeProps {
  // Remove tournaments prop
}
```

---

### 3. **Clean Up Tournament Files**
**Priority:** MEDIUM 🟡
**Time:** 10 minutes

**Files to Delete:**
- `components/TournamentInfoModal.tsx` (unused after removal)
- `TOURNAMENT_SYSTEM.md` (outdated documentation)
- `server/src/tournamentManager.ts.disabled` (already disabled, can delete)

**Command:**
```bash
rm components/TournamentInfoModal.tsx
rm TOURNAMENT_SYSTEM.md
rm server/src/tournamentManager.ts.disabled
```

---

## ✅ Testing & Verification

### 4. **Test Fun Game (Free Play)**
**Priority:** HIGH 🔴
**Time:** 15 minutes

**Test Steps:**
1. Start server: `cd server && npm run dev`
2. Start client: `npm run dev`
3. Create a "Just for Fun" table
4. Join without any balance
5. Verify:
   - ✅ No balance check error
   - ✅ Chips appear automatically
   - ✅ Can play hands
   - ✅ Balance unchanged after leaving
   - ✅ No transaction in database

**Database Check:**
```bash
cd server && node scripts/verify-db.js
# Verify transaction count doesn't increase
```

---

### 5. **Test Cash Game (Real Money)**
**Priority:** HIGH 🔴
**Time:** 15 minutes

**Test Steps:**
1. Create a "Cash Game" table
2. Try to join with insufficient balance
3. Verify error message appears
4. Add balance (deposit)
5. Join successfully
6. Play a hand
7. Leave table
8. Verify:
   - ✅ Balance deducted on join
   - ✅ Balance returned on leave
   - ✅ Transactions logged in DB
   - ✅ Rake distributed correctly

---

## 🛠️ Code Cleanup

### 6. **Update Documentation Files**
**Priority:** MEDIUM 🟡
**Time:** 20 minutes

**Files to Update:**
- `PROJECT_SUMMARY.md` - Remove tournament references
- `IMPLEMENTATION_SUMMARY.md` - Update with current features
- `README.md` (if exists) - Update feature list

**Remove mentions of:**
- Tournament system
- Tournament hosting
- Prize pools (if tournament-specific)

**Add mentions of:**
- Free fun games
- PostgreSQL migration complete
- Supabase integration

---

### 7. **Clean Up Migration Files**
**Priority:** LOW 🟢
**Time:** 5 minutes

**Decision Needed:**
- Keep or delete `server/MIGRATION_TO_POSTGRES.md`?
- Keep or delete `server/PRISMA_POSTGRES_INSTRUCTIONS.md`?
- Keep or delete `server/prisma/csv_export/` folder?
- Keep or delete `server/prisma/dev.db.bak`?

**Recommendation:**
- ✅ Keep `.bak` file for 1 week (rollback safety)
- ✅ Keep CSV exports for 1 week
- ❌ Delete migration docs (already completed)
- ✅ Add these to `.gitignore`

---

## 🎨 UI/UX Improvements (Optional)

### 8. **Add "Free Play" Badge to Fun Games**
**Priority:** LOW 🟢
**Time:** 10 minutes

**Add visual indicator:**
```tsx
// In TableCard component
{table.type === 'FUN' && (
  <span className="bg-yellow-500/20 text-yellow-500 text-xs px-2 py-1 rounded">
    FREE PLAY
  </span>
)}
```

---

### 9. **Update CreateGameModal Help Text**
**Priority:** LOW 🟢
**Time:** 5 minutes

Add tooltip/info explaining:
- "Cash Game" = Real balance required
- "Just for Fun" = Free play, no deposit needed

---

## 📊 Database Maintenance

### 10. **Verify Supabase Backup Settings**
**Priority:** MEDIUM 🟡
**Time:** 5 minutes

**Check in Supabase Dashboard:**
1. Go to database settings
2. Verify automatic backups enabled
3. Check backup frequency
4. Note recovery point

**URL:** https://supabase.com/dashboard/project/vehbacgntirheqgpbrrz

---

### 11. **Add Database Indexes (Performance)**
**Priority:** LOW 🟢
**Time:** 10 minutes

**Already in schema, verify they exist:**
```sql
-- Check indexes
SELECT * FROM pg_indexes WHERE tablename IN ('User', 'Transaction', 'Hand');
```

**If missing, they should auto-create from Prisma schema**

---

## 🐛 Bug Fixes

### 12. **Check for GameType.TOURNAMENT Errors**
**Priority:** HIGH 🔴
**Time:** 10 minutes

**Search and replace:**
```bash
# Search for any remaining TOURNAMENT references
grep -r "GameType.TOURNAMENT" --include="*.tsx" --include="*.ts"

# Or use VS Code: Ctrl+Shift+F
# Search: GameType.TOURNAMENT
# Replace: GameType.CASH (or remove)
```

---

## 📝 Git Commit Strategy

### 13. **Commit Changes in Logical Groups**
**Priority:** MEDIUM 🟡
**Time:** 15 minutes

**Suggested commits:**

```bash
# Commit 1: Database migration
git add server/.env.example server/prisma/ server/scripts/
git commit -m "feat: migrate to PostgreSQL (Supabase) from SQLite"

# Commit 2: Tournament removal
git add server/src/server.ts server/src/tournamentManager.ts types.ts
git add server/prisma/migrations/*remove_tournament*
git commit -m "feat: remove tournament system (not production ready)"

# Commit 3: Fun games free play
git add server/src/gameManager.ts
git commit -m "feat: make fun games completely free (no deposits required)"

# Commit 4: UI cleanup
git add components/CreateGameModal.tsx pages/
git commit -m "refactor: update UI to remove tournament references"
```

**Note:** Do NOT commit `.env` file!

---

## 🔮 Future Enhancements (Not Tomorrow)

### Ideas for Later:
- [ ] Add fun game leaderboard (play chips)
- [ ] Add tutorial mode for new users
- [ ] Re-implement tournaments (when ready)
- [ ] Add more game modes (Sit & Go, etc.)
- [ ] Social features for fun games

---

## ⏱️ Time Estimate Summary

| Task | Priority | Time |
|------|----------|------|
| 1. Remove .env from git | URGENT | 5 min |
| 2. Remove tournament from pages | HIGH | 20 min |
| 3. Delete unused files | MEDIUM | 10 min |
| 4. Test fun games | HIGH | 15 min |
| 5. Test cash games | HIGH | 15 min |
| 6. Update docs | MEDIUM | 20 min |
| 7. Clean migration files | LOW | 5 min |
| **TOTAL CRITICAL** | | **~55 min** |
| **TOTAL ALL** | | **~90 min** |

---

## ✅ Success Criteria for Tomorrow

By end of tomorrow, you should have:

- [x] No sensitive data in git
- [x] No tournament references in UI
- [x] Fun games tested and working (free)
- [x] Cash games tested and working (paid)
- [x] Clean git history
- [x] Updated documentation
- [x] Production-ready codebase

---

## 🆘 If You Get Stuck

**Common Issues:**

1. **Database connection fails**
   - Check Supabase dashboard for downtime
   - Verify `DATABASE_URL` in `.env`
   - Run: `npx prisma db push` to sync schema

2. **Fun game still deducting balance**
   - Check `gameManager.ts` line 198
   - Verify `isFunGame` check is working
   - Check table `gameMode` property

3. **Build errors**
   - Run: `cd server && npx prisma generate`
   - Run: `npm install` (refresh dependencies)
   - Clear `node_modules` and reinstall

---

## 💡 Pro Tips

1. **Test in this order:** Critical fixes → Testing → Cleanup → Commits
2. **Backup before commits:** `git stash` is your friend
3. **Small commits:** Easier to revert if needed
4. **Test after each change:** Don't batch test at the end

---

## 📞 Need Help?

**Resources:**
- Prisma Docs: https://www.prisma.io/docs
- Supabase Docs: https://supabase.com/docs
- Your WORK_SUMMARY file (created today)

---

**Good luck tomorrow! 🚀**

**Remember:** Start with security (#1), then fix tournament references (#2), then test (#4-5).

The rest is optional cleanup!
