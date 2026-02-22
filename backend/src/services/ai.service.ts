/**
 * AI Service - SiliconFlow API Integration with Tool Calling Support
 * Supports DeepSeek-V3.2 and other models via SiliconFlow
 * Implements ReAct Agent pattern with tool use
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface AIResult {
  type: 'text' | 'tool_calls';
  content?: string;
  tool_calls?: ToolCall[];
  rawMessage?: any;
  tokensUsed?: number;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  enable_thinking?: boolean;
  thinking_budget?: number;
  tools?: Tool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content?: string;
      reasoning_content?: string;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface BotConfig {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
  enable_thinking?: boolean;
  thinking_budget?: number;
  top_p?: number;
}

class AIService {
  private readonly baseURL = 'https://api.siliconflow.cn/v1';
  private readonly apiKey: string;
  private readonly defaultModel = 'deepseek-ai/DeepSeek-V3.2';
  private readonly defaultConfig = {
    temperature: 0.7,
    max_tokens: 2048,
    enable_thinking: true,
    thinking_budget: 4096,
    top_p: 0.7
  };

  constructor() {
    this.apiKey = process.env.SILICONFLOW_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️  SILICONFLOW_API_KEY not set in environment variables');
    }
  }

  /**
   * Generate AI response with optional tool calling support (ReAct Agent)
   */
  async generateResponse(
    messages: ChatMessage[],
    botConfig?: BotConfig,
    tools?: Tool[]
  ): Promise<AIResult> {
    if (!this.apiKey) {
      return {
        type: 'text',
        content: this.getFallbackResponse(messages)
      };
    }

    const config = { ...this.defaultConfig, ...botConfig };
    const model = config.model || this.defaultModel;

    // Ensure system prompt is first if provided
    const requestMessages: ChatMessage[] = [];
    if (botConfig?.system_prompt) {
      requestMessages.push({
        role: 'system',
        content: botConfig.system_prompt
      });
    }
    requestMessages.push(...messages);

    const requestBody: ChatCompletionRequest = {
      model,
      messages: requestMessages,
      stream: false,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      top_p: config.top_p
    };

    // Add tools if provided (ReAct Agent mode)
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
      console.log(`🔧 Agent mode: Enabled with ${tools.length} tools`);
    }

    // Add thinking parameters for supported models
    if (config.enable_thinking) {
      requestBody.enable_thinking = true;
      if (config.thinking_budget) {
        requestBody.thinking_budget = config.thinking_budget;
      }
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SiliconFlow API error:', response.status, errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data: ChatCompletionResponse = await response.json() as ChatCompletionResponse;
      const choice = data.choices[0];
      const message = choice.message;

      // Check if AI decided to use tools
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(`🛠️  AI decided to use ${message.tool_calls.length} tool(s):`,
          message.tool_calls.map(tc => tc.function.name).join(', '));

        return {
          type: 'tool_calls',
          tool_calls: message.tool_calls,
          rawMessage: message, // Preserve for conversation history
          tokensUsed: data.usage.total_tokens
        };
      }

      // Direct text response
      if (message.content) {
        console.log(`✅ AI Response generated (${data.usage.total_tokens} tokens)`);
        return {
          type: 'text',
          content: message.content,
          tokensUsed: data.usage.total_tokens
        };
      }

      throw new Error('Invalid response format from API');
    } catch (error) {
      console.error('Error calling SiliconFlow API:', error);
      return {
        type: 'text',
        content: this.getFallbackResponse(messages)
      };
    }
  }

  /**
   * Legacy method for simple text responses (without tools)
   */
  async generateSimpleResponse(
    messages: ChatMessage[],
    botConfig?: BotConfig
  ): Promise<string> {
    const result = await this.generateResponse(messages, botConfig);
    return result.content || this.getFallbackResponse(messages);
  }

  /**
   * Stream a simple text response (no tool-calling loop).
   * Parses OpenAI-compatible SSE chunks returned by SiliconFlow.
   */
  async generateSimpleResponseStream(
    messages: ChatMessage[],
    botConfig: BotConfig | undefined,
    onDelta: (text: string) => void
  ): Promise<string> {
    if (!this.apiKey) {
      const fallback = this.getFallbackResponse(messages);
      if (fallback) onDelta(fallback);
      return fallback;
    }

    const config = { ...this.defaultConfig, ...(botConfig || {}) };
    const model = config.model || this.defaultModel;

    const requestMessages: ChatMessage[] = [];
    if (botConfig?.system_prompt) {
      requestMessages.push({
        role: 'system',
        content: botConfig.system_prompt
      });
    }
    requestMessages.push(...messages);

    const requestBody: ChatCompletionRequest = {
      model,
      messages: requestMessages,
      stream: true,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      top_p: config.top_p
    };

    if (config.enable_thinking) {
      requestBody.enable_thinking = true;
      if (config.thinking_budget) {
        requestBody.thinking_budget = config.thinking_budget;
      }
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Stream API request failed: ${response.status} ${response.statusText} ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body from AI stream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const eventBlock of events) {
        const lines = eventBlock.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataText = trimmed.slice(5).trim();
          if (!dataText || dataText === '[DONE]') continue;

          try {
            const payload = JSON.parse(dataText);
            const delta = payload?.choices?.[0]?.delta?.content ?? payload?.choices?.[0]?.message?.content;
            if (typeof delta === 'string' && delta) {
              fullText += delta;
              onDelta(delta);
            }
          } catch {
            // Ignore malformed partial chunks from upstream
          }
        }
      }
    }

    if (!fullText) {
      // Some providers may send final content in a non-stream-compatible shape
      // and our parser ignores it; return empty string to let caller decide fallback.
      return '';
    }

    return fullText;
  }

  /**
   * Generate a simple response without AI (fallback)
   */
  private getFallbackResponse(messages: ChatMessage[]): string {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (lastUserMessage) {
      return `我收到了你的消息："${lastUserMessage.content}"\n\n目前AI服务未配置，请设置 SILICONFLOW_API_KEY 环境变量以启用智能回复。`;
    }
    return '你好！很高兴与你对话。';
  }

  /**
   * Check if AI service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get the current model being used
   */
  getCurrentModel(): string {
    return this.defaultModel;
  }
}

export default new AIService();
export type {
  ChatMessage,
  BotConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  Tool,
  ToolCall,
  AIResult
};
