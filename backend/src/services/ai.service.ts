/**
 * AI Service - SiliconFlow API Integration
 * Supports DeepSeek-V3.2 and other models via SiliconFlow
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
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
      content: string;
      reasoning_content?: string;
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
   * Generate AI response for a conversation
   */
  async generateResponse(
    messages: ChatMessage[],
    botConfig?: BotConfig
  ): Promise<string> {
    if (!this.apiKey) {
      return this.getFallbackResponse(messages);
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

      // Extract the assistant's response
      if (data.choices && data.choices.length > 0) {
        const choice = data.choices[0];
        if (choice.message && choice.message.content) {
          console.log(`✅ AI Response generated (${data.usage.total_tokens} tokens)`);
          return choice.message.content;
        }
      }

      throw new Error('Invalid response format from API');
    } catch (error) {
      console.error('Error calling SiliconFlow API:', error);
      // Return fallback response on error
      return this.getFallbackResponse(messages);
    }
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
export type { ChatMessage, BotConfig, ChatCompletionRequest, ChatCompletionResponse };
