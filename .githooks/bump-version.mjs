#!/usr/bin/env node
// pre-commit 钩子的核心逻辑：自动维护 src/version.json（版本号格式 X.YYY）
// - commit 消息开头带版本号（如 "2.001: 大版本更新"）→ 直接使用指定版本
// - 否则在当前版本基础上 +0.001；子版本满 1000 进位（1.999 → 2.001）
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf-8' }).trim()
}

try {
  const cwd = process.cwd()

  // 1. 定位 git 目录，读取本次提交消息（pre-commit 阶段消息已写入 COMMIT_EDITMSG）
  const gitDirPath = resolve(cwd, git(['rev-parse', '--git-dir'], cwd))
  const repoRoot = git(['rev-parse', '--show-toplevel'], cwd)
  const versionFile = join(repoRoot, 'src', 'version.json')

  const commitMsg = readFileSync(join(gitDirPath, 'COMMIT_EDITMSG'), 'utf-8')

  // 2. 消息开头带版本号 → 用指定版本；否则自动 +0.001
  const specified = /^(\d+\.\d{3})(?:\s|:|$)/.exec(commitMsg)

  const currentVersion = JSON.parse(readFileSync(versionFile, 'utf-8')).version

  let nextVersion
  if (specified) {
    nextVersion = specified[1]
  } else {
    const m = /^(\d+)\.(\d{3})$/.exec(currentVersion)
    if (!m) {
      throw new Error(`src/version.json 中的版本号格式不正确: "${currentVersion}"，应为 X.YYY`)
    }
    let major = Number(m[1])
    let sub = Number(m[2]) + 1
    if (sub >= 1000) {
      major += 1
      sub = 1 // 进位后从 .001 起步（1.999 → 2.001）
    }
    nextVersion = `${major}.${String(sub).padStart(3, '0')}`
  }

  // 3. 写回 src/version.json 并纳入本次提交
  writeFileSync(versionFile, JSON.stringify({ version: nextVersion }, null, 2) + '\n', 'utf-8')
  execFileSync('git', ['add', 'src/version.json'], { cwd: repoRoot, stdio: 'inherit' })

  console.log(`[version] ${currentVersion} -> ${nextVersion}`)
} catch (err) {
  console.error('[version] 版本号更新失败，已阻止提交：')
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
}
