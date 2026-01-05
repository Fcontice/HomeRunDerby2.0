# Session Start Guide

Quick prompts to start new Claude Code sessions for this project.

---

## 🐛 For Bug Fixes / Existing Feature Work

Copy-paste this into a new Claude Code session:

```
New session for Home Run Derby 2.0 project.

1. Read CLAUDE.md and PROJECT_CONTEXT.md
2. I'm working on: [describe the bug/issue/feature to fix]
3. Affected areas: [e.g., "team creation", "authentication", "player search"]

Please:
- Understand the current implementation
- Identify relevant files
- Ask clarifying questions before making changes
- Propose a fix approach for my approval

Don't start coding until I approve the approach.
```

**Example:**
```
New session for Home Run Derby 2.0 project.

1. Read CLAUDE.md and PROJECT_CONTEXT.md
2. I'm working on: Users can't submit teams even with valid roster
3. Affected areas: Team creation flow, validation

Please:
- Understand the current implementation
- Identify relevant files
- Ask clarifying questions before making changes
- Propose a fix approach for my approval

Don't start coding until I approve the approach.
```

---

## ✨ For New Feature Implementation

Copy-paste this into a new Claude Code session:

```
New session for Home Run Derby 2.0 project.

1. Read CLAUDE.md, PROJECT_CONTEXT.md, and CHANGELOG.md
2. I want to implement: [describe the new feature]
3. This is part of: [Phase 2/3/4/5 or "custom addition"]

Please:
- Review current implementation status
- Identify what's already built that I can leverage
- Check for existing patterns to follow
- Propose an implementation plan
- Ask about any unclear requirements

Wait for my approval before starting implementation.
```

**Example:**
```
New session for Home Run Derby 2.0 project.

1. Read CLAUDE.md, PROJECT_CONTEXT.md, and CHANGELOG.md
2. I want to implement: Stripe payment integration for team entries
3. This is part of: Phase 2 (Team Creation)

Please:
- Review current implementation status
- Identify what's already built that I can leverage
- Check for existing patterns to follow
- Propose an implementation plan
- Ask about any unclear requirements

Wait for my approval before starting implementation.
```

---

## 📊 For Status Check / Project Review

Use this when you just want to understand where things are:

```
New session for Home Run Derby 2.0 project.

Read PROJECT_CONTEXT.md and CHANGELOG.md, then give me:
1. Current implementation status (what's done vs. pending)
2. What was most recently worked on
3. Immediate next priorities

Don't propose changes yet - just summarize the current state.
```

---

## 🔍 For Code Exploration / Understanding

Use this when exploring unfamiliar parts of the codebase:

```
New session for Home Run Derby 2.0 project.

1. Read CLAUDE.md for architecture patterns
2. I want to understand: [specific area, e.g., "authentication flow", "database layer", "team validation"]

Please:
- Explore relevant files
- Explain how it works
- Show me the key files and patterns
- Point out any issues or areas for improvement

Just explain, don't make changes yet.
```

---

## 💡 Best Practices

### Always Include in Your Initial Prompt:
1. **Which docs to read** - CLAUDE.md is essential for architecture
2. **What you're working on** - Be specific about the goal
3. **Approval requirement** - Prevents unwanted changes

### When Starting the Session:
1. ✅ **Read documentation first** - Let Claude understand the context
2. ✅ **Be specific** - Clear goals get better results
3. ✅ **Require approval** - Review plans before execution
4. ✅ **Reference existing patterns** - Maintain consistency

### During the Session:
- Use TodoWrite for multi-step tasks
- Reference files with `file_path:line_number` pattern
- Keep changes focused on the stated goal
- Test incrementally as you build

---

## 🚀 Quick Commands Reference

```bash
# Frontend
cd frontend && npm run dev          # Start dev server (port 5173)
npm run build                        # Build for production
npm run lint                         # Run ESLint

# Backend
cd backend && npm run dev            # Start with hot reload (port 5000)
npm run build                        # Compile TypeScript
npm run prisma:studio                # Open database GUI

# Database
npm run prisma:generate              # Generate Prisma types
npm run prisma:push                  # Push schema to Supabase
npm run import:players               # Import player data
```

---

## 📁 Key Files to Know

**Must Read:**
- `CLAUDE.md` - Architecture patterns and quick reference
- `PROJECT_CONTEXT.md` - Requirements and implementation status

**Reference as Needed:**
- `CHANGELOG.md` - Development history
- `README.md` - Setup instructions
- `backend/prisma/schema.prisma` - Database schema

**Current Work:**
- `frontend/src/pages/CreateTeam.tsx` - Team creation UI
- `backend/src/controllers/teamController.ts` - Team business logic
- `backend/src/services/db.ts` - Database abstraction layer

---

**Last Updated:** December 30, 2025
