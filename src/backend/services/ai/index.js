const AIService = require('./ai-service');
const ConversationManager = require('./conversation-manager');
const ContentGenerator = require('./content-generator');
const SmartSearch = require('./smart-search');
const DataAnalysisAssistant = require('./data-analysis-assistant');

const {
  AIService: AIServiceClass,
  OpenAIService,
  ClaudeService,
  AIServiceFactory,
  AIManager,
  aiManager
} = AIService;

const {
  ConversationManager: ConversationManagerClass,
  conversationManager
} = ConversationManager;

const {
  ContentGenerator: ContentGeneratorClass,
  contentGenerator
} = ContentGenerator;

const { SmartSearch: SmartSearchClass, smartSearch } = SmartSearch;

const {
  DataAnalysisAssistant: DataAnalysisAssistantClass,
  dataAnalysisAssistant
} = DataAnalysisAssistant;

module.exports = {
  AIService: AIServiceClass,
  OpenAIService,
  ClaudeService,
  AIServiceFactory,
  AIManager,
  aiManager,

  ConversationManager: ConversationManagerClass,
  conversationManager,

  ContentGenerator: ContentGeneratorClass,
  contentGenerator,

  SmartSearch: SmartSearchClass,
  smartSearch,

  DataAnalysisAssistant: DataAnalysisAssistantClass,
  dataAnalysisAssistant,

  AIServices: AIService,
  ConversationManagers: ConversationManager,
  ContentGenerators: ContentGenerator,
  SmartSearches: SmartSearch,
  DataAnalysisAssistants: DataAnalysisAssistant
};
