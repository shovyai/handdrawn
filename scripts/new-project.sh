#!/usr/bin/env bash
# 新建一个手绘讲解视频工程：bash new-project.sh <目标目录>
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dest="${1:?用法：bash new-project.sh <目标目录>}"
if [ -e "$dest" ] && [ -n "$(ls -A "$dest" 2>/dev/null)" ]; then
  echo "目标目录不是空的：$dest" >&2
  exit 1
fi
mkdir -p "$dest"
# 复制模板，不带依赖和旧输出
(cd "$here/template" && tar --exclude=node_modules --exclude=output -cf - .) | (cd "$dest" && tar -xf -)
cd "$dest"
echo "安装依赖……"
npm install --no-audit --no-fund
echo "检查模板……"
npm run check
echo
echo "工程已建好：$dest"
echo "下一步：npm run render 出演示片；然后改 data/script.json 和 src/scenes/。"
