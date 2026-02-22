import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

interface GroupMemberData {
  bot_id: string;
  role?: string;
  permissions?: string[];
  trigger_keywords?: string[];
  priority?: number;
}

interface CreateGroupData {
  name: string;
  type?: string;
  description?: string;
  routing_strategy?: string;
  conversation_mode?: string;
  created_by?: string;
}

interface UpdateGroupData {
  name?: string;
  type?: string;
  description?: string;
  routing_strategy?: string;
  conversation_mode?: string;
}

class GroupService {
  async getGroups(filters: { page?: number; page_size?: number; search?: string }) {
    const { page = 1, page_size = 50, search = '' } = filters;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.group.findMany({
        where,
        skip: (page - 1) * page_size,
        take: page_size,
        orderBy: { updated_at: 'desc' },
        include: {
          members: {
            include: {
              bot: {
                select: {
                  bot_id: true,
                  name: true,
                  avatar: true,
                  scene: true,
                  status: true
                }
              }
            },
            orderBy: { priority: 'desc' }
          },
          _count: {
            select: {
              members: true,
              messages: true
            }
          }
        }
      }),
      prisma.group.count({ where })
    ]);

    return { items, total, page, page_size };
  }

  async getGroupById(groupId: string) {
    const group = await prisma.group.findUnique({
      where: { group_id: groupId },
      include: {
        members: {
          include: {
            bot: true
          },
          orderBy: { priority: 'desc' }
        },
        _count: {
          select: {
            members: true,
            messages: true
          }
        }
      }
    });

    if (!group) {
      throw new Error('群组不存在');
    }

    return group;
  }

  async createGroup(data: CreateGroupData) {
    const group_id = `group_${Date.now()}_${randomUUID().slice(0, 8)}`;

    return await prisma.group.create({
      data: {
        group_id,
        name: data.name,
        type: data.type || 'personal',
        description: data.description || null,
        routing_strategy: data.routing_strategy || 'ai_judge',
        conversation_mode: data.conversation_mode || 'multi_turn',
        created_by: data.created_by || 'system'
      }
    });
  }

  async updateGroup(groupId: string, data: UpdateGroupData) {
    const group = await prisma.group.findUnique({
      where: { group_id: groupId }
    });

    if (!group) {
      throw new Error('群组不存在');
    }

    return await prisma.group.update({
      where: { group_id: groupId },
      data
    });
  }

  async deleteGroup(groupId: string) {
    const group = await prisma.group.findUnique({
      where: { group_id: groupId }
    });

    if (!group) {
      throw new Error('群组不存在');
    }

    await prisma.group.delete({
      where: { group_id: groupId }
    });

    return { success: true };
  }

  async addMember(groupId: string, memberData: GroupMemberData) {
    const group = await prisma.group.findUnique({
      where: { group_id: groupId }
    });

    if (!group) {
      throw new Error('群组不存在');
    }

    const bot = await prisma.bot.findUnique({
      where: { bot_id: memberData.bot_id }
    });

    if (!bot) {
      throw new Error('Bot不存在');
    }

    return await prisma.groupMember.create({
      data: {
        group_id: groupId,
        bot_id: memberData.bot_id,
        role: memberData.role || null,
        permissions: memberData.permissions || undefined,
        trigger_keywords: memberData.trigger_keywords || [],
        priority: memberData.priority || 0
      },
      include: {
        bot: true
      }
    });
  }

  async updateMember(groupId: string, memberId: string, memberData: Partial<GroupMemberData>) {
    const member = await prisma.groupMember.findFirst({
      where: {
        id: memberId,
        group_id: groupId
      }
    });

    if (!member) {
      throw new Error('群成员不存在');
    }

    const updateData: any = {};
    if (memberData.role !== undefined) updateData.role = memberData.role;
    if (memberData.permissions !== undefined) updateData.permissions = memberData.permissions;
    if (memberData.trigger_keywords !== undefined) updateData.trigger_keywords = memberData.trigger_keywords;
    if (memberData.priority !== undefined) updateData.priority = memberData.priority;

    return await prisma.groupMember.update({
      where: { id: memberId },
      data: updateData,
      include: {
        bot: true
      }
    });
  }

  async removeMember(groupId: string, memberId: string) {
    const member = await prisma.groupMember.findFirst({
      where: {
        id: memberId,
        group_id: groupId
      }
    });

    if (!member) {
      throw new Error('群成员不存在');
    }

    await prisma.groupMember.delete({
      where: { id: memberId }
    });

    return { success: true };
  }

  async getGroupMembers(groupId: string) {
    const members = await prisma.groupMember.findMany({
      where: { group_id: groupId },
      include: {
        bot: true
      },
      orderBy: { priority: 'desc' }
    });

    return members;
  }
}

export default new GroupService();
