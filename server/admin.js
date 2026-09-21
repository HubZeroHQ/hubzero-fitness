// Admin tasks from the command line (there is no password-reset email):
//   node server/admin.js list
//   node server/admin.js reset-password <email>          -> sets password back to "hubzero" and forces a change
//   node server/admin.js add-user <email> "<Full Name>" <coach|moderator|member>
//   node server/admin.js set-role <email> <coach|moderator|member>
import { DEFAULT_PASSWORD, audit, hashPassword, openDb } from './db.js'

const [cmd, ...args] = process.argv.slice(2)
const db = openDb()
const roles = ['coach', 'moderator', 'member']
const record = (action, target, detail = '') => audit(db, { actorName: 'Server admin (command line)', category: 'admin', action, target, detail })

function need(cond, msg) {
  if (!cond) {
    console.error(msg)
    process.exit(1)
  }
}

if (cmd === 'list') {
  for (const u of db.prepare('SELECT email, full_name, role, must_change_password FROM users ORDER BY id').all()) {
    console.log(`${u.full_name} <${u.email}> ${u.role}${u.must_change_password ? ' (must change password)' : ''}`)
  }
} else if (cmd === 'reset-password') {
  const r = db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE email = ?').run(hashPassword(DEFAULT_PASSWORD), (args[0] ?? '').toLowerCase())
  need(r.changes === 1, 'No user with that email.')
  db.prepare('DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = ?)').run(args[0].toLowerCase())
  record('cli_reset_password', args[0])
  console.log(`Password for ${args[0]} reset to "${DEFAULT_PASSWORD}". They must change it on next login.`)
} else if (cmd === 'add-user') {
  const [email, name, role = 'member'] = args
  need(email && name && roles.includes(role), 'Usage: add-user <email> "<Full Name>" <coach|moderator|member>')
  db.prepare('INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)').run(email.toLowerCase(), hashPassword(DEFAULT_PASSWORD), name, role)
  record('cli_add_user', email.toLowerCase(), `${name}, ${role}`)
  console.log(`Added ${name}. Initial password: "${DEFAULT_PASSWORD}" (must be changed on first login).`)
} else if (cmd === 'set-role') {
  need(args[0] && roles.includes(args[1]), 'Usage: set-role <email> <coach|moderator|member>')
  const r = db.prepare('UPDATE users SET role = ? WHERE email = ?').run(args[1], args[0].toLowerCase())
  need(r.changes === 1, 'No user with that email.')
  record('cli_set_role', args[0].toLowerCase(), args[1])
  console.log('Updated.')
} else {
  console.log('Commands: list | reset-password <email> | add-user <email> "<Name>" <role> | set-role <email> <role>')
}
