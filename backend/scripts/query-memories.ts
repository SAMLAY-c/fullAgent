import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 先检查是否有 ConversationArchiveMemory 记录
  const count = await prisma.conversationArchiveMemory.count();
  console.log(`数据库中共有 ${count} 条记忆记录\n`);

  if (count === 0) {
    console.log('暂无记忆数据');
    return;
  }

  const memories = await prisma.conversationArchiveMemory.findMany({
    take: 30,
    orderBy: { created_at: 'desc' },
    include: {
      folder: {
        select: {
          folder_id: true,
          name: true
        }
      },
      conversation: {
        select: {
          conversation_id: true,
          title: true,
          bot_id: true
        }
      }
    }
  });

  console.log('\n=== 已保存的记忆列表 ===\n');
  console.log(`共找到 ${memories.length} 条记忆\n`);

  memories.forEach((m, i) => {
    const summaryPreview = m.summary ? m.summary.slice(0, 100) + (m.summary.length > 100 ? '...' : '') : '无摘要';
    console.log(`${i + 1}. [${m.memory_id.slice(0, 8)}...] ${m.title || '无标题'}`);
    console.log(`   主题: ${m.folder?.name || m.folder_id || '未分配'} (${m.folder_id})`);
    console.log(`   摘要: ${summaryPreview}`);
    console.log(`   来源对话: ${m.conversation?.title || m.conversation_id} [Bot: ${m.conversation?.bot_id}]`);
    console.log(`   归档序号: ${m.archive_index} | 创建时间: ${m.created_at.toLocaleString('zh-CN')}`);
    if (m.insight) {
      console.log(`   洞察: ${m.insight.slice(0, 80)}...`);
    }
    console.log('');
  });

  // 统计每个主题下的记忆数量
  const folderStats = await prisma.conversationArchiveMemory.groupBy({
    by: ['folder_id'],
    _count: { memory_id: true },
    orderBy: { _count: { memory_id: 'desc' } }
  });

  // 获取主题名称
  const folderIds = folderStats.map(s => s.folder_id);
  const folders = await prisma.folder.findMany({
    where: { folder_id: { in: folderIds } },
    select: { folder_id: true, name: true }
  });

  const folderMap = Object.fromEntries(folders.map(f => [f.folder_id, f.name]));

  console.log('\n=== 主题统计 ===\n');
  folderStats.forEach(s => {
    const folderName = folderMap[s.folder_id] || s.folder_id;
    console.log(`📁 ${folderName}: ${s._count.memory_id} 条记忆`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
