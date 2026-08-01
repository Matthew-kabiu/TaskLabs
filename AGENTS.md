<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Git remotes — both authoritative

Two remotes exist and both must receive every push:

- `origin` → https://github.com/Spooky-Organization/Tasklabs.git (organization)
- `personal` → https://github.com/Matthew-kabiu/TaskLabs.git (Matthew)

Push to both `main` branches: `git push origin main && git push personal main`. A commit that exists on only one remote is not considered done. Do not add, rename, or repoint remotes without explicit instruction.
