import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建种子数据...');

  // 创建 admin 用户
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      user_id: 'user_admin_001',
      username: 'admin',
      email: 'admin@example.com',
      password_hash: adminPassword,
      role: 'admin',
      avatar: '👤'
    }
  });
  console.log('✓ 创建admin用户:', admin.username);

  // 创建示例 Bots
  const bots = [
    {
      bot_id: 'bot_work_001',
      name: '你的工作伙伴',
      avatar: '💼',
      type: 'work',
      scene: 'work',
      status: 'online',
      description: '工作助手，帮你管理任务、规划时间',
      config: {
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 2000,
        system_prompt: '你是一个专业的工作助手，擅长任务管理、时间规划和效率提升。'
      }
    },
    {
      bot_id: 'bot_life_001',
      name: '生活小助手',
      avatar: '🌿',
      type: 'life',
      scene: 'life',
      status: 'online',
      description: '生活助手，健康饮食、运动建议',
      config: {
        model: 'gpt-4',
        temperature: 0.8,
        max_tokens: 2000,
        system_prompt: '你是一个友好的生活助手，关注健康饮食、运动规划和生活小技巧。'
      }
    },
    {
      bot_id: 'bot_love_001',
      name: '心灵朋友',
      avatar: '💜',
      type: 'love',
      scene: 'love',
      status: 'online',
      description: '心灵朋友，倾听你的情感困惑',
      config: {
        model: 'gpt-4',
        temperature: 0.9,
        max_tokens: 2000,
        system_prompt: '你是一个温暖的心灵朋友，擅长倾听和提供情感支持。'
      }
    },
    {
      bot_id: 'bot_group_001',
      name: '创业CEO Bot',
      avatar: '🎯',
      type: 'group',
      scene: 'group',
      status: 'online',
      description: '创业团队的CEO，负责战略决策',
      config: {
        model: 'gpt-4',
        temperature: 0.6,
        max_tokens: 2000,
        system_prompt: '你是一位经验丰富的CEO，擅长战略决策和资源分配。'
      }
    },
    {
      bot_id: 'bot_group_002',
      name: '创业CTO Bot',
      avatar: '💻',
      type: 'group',
      scene: 'group',
      status: 'online',
      description: '创业团队的CTO，负责技术架构',
      config: {
        model: 'gpt-4',
        temperature: 0.5,
        max_tokens: 2000,
        system_prompt: '你是一位技术专家，擅长架构设计和技术方案。'
      }
    },
    {
      bot_id: 'bot_group_003',
      name: '创业CMO Bot',
      avatar: '📈',
      type: 'group',
      scene: 'group',
      status: 'online',
      description: '创业团队的CMO，负责市场增长',
      config: {
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 2000,
        system_prompt: '你是一位营销专家，擅长市场策略和用户增长。'
      }
    }
  ];

  for (const bot of bots) {
    await prisma.bot.upsert({
      where: { bot_id: bot.bot_id },
      update: {},
      create: bot
    });
    console.log(`✓ 创建Bot: ${bot.name}`);
  }

  // 创建示例群聊
  const group1 = await prisma.group.upsert({
    where: { group_id: 'group_001' },
    update: {},
    create: {
      group_id: 'group_001',
      name: '创业顾问团',
      type: 'personal',
      description: '从战略、技术、市场多角度提供建议',
      routing_strategy: 'ai_judge',
      conversation_mode: 'multi_turn',
      created_by: admin.user_id
    }
  });
  console.log('✓ 创建群聊:', group1.name);

  // 添加群成员
  const groupMembers = [
    { group_id: 'group_001', bot_id: 'bot_group_001', role: '战略决策', trigger_keywords: ['战略', '决策', '资源'] },
    { group_id: 'group_001', bot_id: 'bot_group_002', role: '技术架构', trigger_keywords: ['技术', '架构', '开发'] },
    { group_id: 'group_001', bot_id: 'bot_group_003', role: '市场增长', trigger_keywords: ['市场', '增长', '营销'] }
  ];

  for (const member of groupMembers) {
    await prisma.groupMember.upsert({
      where: {
        id: `${member.group_id}_${member.bot_id}`
      },
      update: {},
      create: {
        id: `${member.group_id}_${member.bot_id}`,
        ...member,
        permissions: ['read', 'write', 'mention'],
        priority: 1
      }
    });
  }
  console.log('✓ 添加群成员');

  // 创建第二个群聊
  const group2 = await prisma.group.upsert({
    where: { group_id: 'group_002' },
    update: {},
    create: {
      group_id: 'group_002',
      name: '成长加速器',
      type: 'personal',
      description: '工作、学习、健康三位一体',
      routing_strategy: 'keyword_match',
      conversation_mode: 'multi_turn',
      created_by: admin.user_id
    }
  });
  console.log('✓ 创建群聊:', group2.name);

  console.log('\n种子数据创建完成！');
  console.log('\n登录信息：');
  console.log('  用户名: admin');
  console.log('  密码: admin123');
}

main()
  .catch((e) => {
    console.error('种子数据创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
