/**
 * Tools Service - Agent Tool Definitions and Execution
 * Implements memory recall and knowledge search tools
 */

import { PrismaClient } from '@prisma/client';
import type { Tool, ToolCall } from './ai.service';

const prisma = new PrismaClient();

// ============================================================================
// TOOL DEFINITIONS (Sent to AI)
// ============================================================================

export const AVAILABLE_TOOLS: Record<string, Tool> = {
  memory_recall: {
    type: 'function',
    function: {
      name: 'memory_recall',
      description: '从记忆库检索用户相关信息，用于了解用户偏好、历史对话和重要事实',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '检索关键词，用于搜索相关记忆'
          },
          limit: {
            type: 'number',
            description: '返回结果数量限制，默认5条',
            default: 5
          }
        },
        required: ['query']
      }
    }
  },

  knowledge_search: {
    type: 'function',
    function: {
      name: 'knowledge_search',
      description: '从知识库搜索相关文档内容，用于获取专业知识、文档资料等',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词，用于搜索知识库内容'
          },
          limit: {
            type: 'number',
            description: '返回结果数量限制，默认3条',
            default: 3
          }
        },
        required: ['query']
      }
    }
  }
};

// ============================================================================
// TOOL EXECUTION ENGINE
// ============================================================================

interface ToolExecutionResult {
  success: boolean;
  result: string;
  error?: string;
}

class ToolsService {
  /**
   * Execute a tool call
   */
  async executeTool(
    toolCall: ToolCall,
    userId: string,
    botId: string
  ): Promise<ToolExecutionResult> {
    const { name, arguments: argsString } = toolCall.function;

    try {
      const args = JSON.parse(argsString);

      switch (name) {
        case 'memory_recall':
          return await this.memoryRecall(userId, botId, args);

        case 'knowledge_search':
          return await this.knowledgeSearch(botId, args);

        default:
          return {
            success: false,
            result: '',
            error: `工具 ${name} 未实现`
          };
      }
    } catch (error) {
      console.error(`Tool execution error for ${name}:`, error);
      return {
        success: false,
        result: '',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * Memory Recall Tool - Retrieve user memories from database
   */
  private async memoryRecall(
    userId: string,
    botId: string,
    args: { query: string; limit?: number }
  ): Promise<ToolExecutionResult> {
    try {
      const limit = args.limit || 5;

      const memories = await prisma.memory.findMany({
        where: {
          bot_id: botId,
          user_id: userId,
          OR: [
            { content: { contains: args.query } },
            { type: { contains: args.query } }
          ]
        },
        orderBy: [
          { importance: 'desc' },
          { updated_at: 'desc' }
        ],
        take: limit
      });

      if (memories.length === 0) {
        return {
          success: true,
          result: `没有找到关于"${args.query}"的相关记忆。`
        };
      }

      const formatted = memories.map(m => {
        const typeLabel = {
          conversation: '💬 对话',
          preference: '⭐ 偏好',
          fact: '📝 事实',
          instruction: '🎯 指令'
        }[m.type] || m.type;

        return `[${typeLabel}] ${m.content}`;
      }).join('\n\n');

      return {
        success: true,
        result: `找到 ${memories.length} 条相关记忆:\n\n${formatted}`
      };
    } catch (error) {
      console.error('Memory recall error:', error);
      return {
        success: false,
        result: '',
        error: '记忆检索失败'
      };
    }
  }

  /**
   * Knowledge Search Tool - Search knowledge base chunks
   */
  private async knowledgeSearch(
    botId: string,
    args: { query: string; limit?: number }
  ): Promise<ToolExecutionResult> {
    try {
      const limit = args.limit || 3;

      const chunks = await prisma.knowledgeChunk.findMany({
        where: {
          file: {
            bot_id: botId
          },
          content: {
            contains: args.query
          }
        },
        include: {
          file: {
            select: {
              filename: true
            }
          }
        },
        take: limit
      });

      if (chunks.length === 0) {
        return {
          success: true,
          result: `知识库中没有找到关于"${args.query}"的相关内容。`
        };
      }

      const formatted = chunks.map((chunk, index) => {
        return `[${index + 1}] 来自: ${chunk.file.filename}\n${chunk.content}`;
      }).join('\n\n---\n\n');

      return {
        success: true,
        result: `从知识库找到 ${chunks.length} 条相关内容:\n\n${formatted}`
      };
    } catch (error) {
      console.error('Knowledge search error:', error);
      return {
        success: false,
        result: '',
        error: '知识库搜索失败'
      };
    }
  }

  /**
   * Get available tools for a specific bot type
   */
  getToolsForBot(botType: string, botScene: string): Tool[] {
    const allTools = Object.values(AVAILABLE_TOOLS);

    // Different bot types may have different tool access
    const typeMap: Record<string, string[]> = {
      work: ['memory_recall', 'knowledge_search'],
      life: ['memory_recall', 'knowledge_search'],
      love: ['memory_recall'], // Emotional bots only need memory
      sop: ['memory_recall', 'knowledge_search'],
      group: ['memory_recall', 'knowledge_search'],
    };

    const allowedTools = typeMap[botType] || typeMap[botScene] || ['memory_recall', 'knowledge_search'];

    return allTools.filter(tool =>
      allowedTools.includes(tool.function.name)
    );
  }
}

export default new ToolsService();
export type { ToolExecutionResult };
