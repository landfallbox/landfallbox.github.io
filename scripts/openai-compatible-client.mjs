import process from 'node:process';
import { getLoadedEnvKeys, loadDotEnv } from './load-env.mjs';

loadDotEnv();

export async function readStdinJson() {
	let input = '';
	for await (const chunk of process.stdin) {
		input += chunk;
	}

	if (!input.trim()) {
		throw new Error('Expected JSON payload on stdin.');
	}

	try {
		return JSON.parse(input);
	} catch (error) {
		throw new Error(`Invalid stdin JSON: ${error.message}`);
	}
}

export async function createChatCompletion(messages, { maxTokens = 256 } = {}) {
	const temperature = Number.parseFloat(process.env.OPENAI_METADATA_TEMPERATURE || '0.2');
	const providers = getProviders();
	const errors = [];

	for (const provider of providers) {
		try {
			return await requestChatCompletion(provider, messages, { maxTokens, temperature });
		} catch (error) {
			errors.push(`${provider.name}: ${error.message}`);
		}
	}

	throw new Error(`All metadata model providers failed. ${errors.join(' | ')}`);
}

export function validateModelProviders() {
	const providers = getProviders({ allowDefaults: false });
	const completeProvider = providers.find(isUsableProvider);

	if (completeProvider) {
		return;
	}

	const details = providers
		.map((provider) => {
			const missing = [];
			if (!provider.baseUrl) {
				missing.push('BASE_URL');
			}
			if (!provider.model) {
				missing.push('MODEL');
			}
			if (requiresApiKey(provider) && !provider.apiKey) {
				missing.push('API_KEY');
			}

			return `${provider.name}: missing ${missing.join(', ')}`;
		})
		.join(' | ');

	throw new Error(`At least one metadata model provider must define a usable BASE_URL and MODEL. ${details}`);
}

export function requireString(value, fieldName) {
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`Payload field ${fieldName} must be a non-empty string.`);
	}

	return value.trim();
}

export function optionalString(value, fallback) {
	return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function limitMarkdown(markdown) {
	const maxCharacters = Number.parseInt(process.env.OPENAI_METADATA_MAX_CHARS || '24000', 10);
	const characters = [...markdown];

	if (!Number.isFinite(maxCharacters) || maxCharacters <= 0 || characters.length <= maxCharacters) {
		return markdown;
	}

	return `${characters.slice(0, maxCharacters).join('')}\n\n[内容已因长度限制截断]`;
}

export function cleanPlainText(value) {
	return stripCodeFence(value)
		.replace(/^['"“”]|['"“”]$/g, '')
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function parseJsonOutput(value) {
	const text = stripCodeFence(value).trim();

	try {
		return JSON.parse(text);
	} catch {
		const arrayStart = text.indexOf('[');
		const arrayEnd = text.lastIndexOf(']');
		if (arrayStart !== -1 && arrayEnd > arrayStart) {
			return JSON.parse(text.slice(arrayStart, arrayEnd + 1));
		}

		const objectStart = text.indexOf('{');
		const objectEnd = text.lastIndexOf('}');
		if (objectStart !== -1 && objectEnd > objectStart) {
			return JSON.parse(text.slice(objectStart, objectEnd + 1));
		}

		throw new Error('Model output was not valid JSON.');
	}
}

export function uniqueStrings(values) {
	const result = [];

	for (const value of values) {
		if (typeof value !== 'string') {
			continue;
		}

		const normalized = value.trim();
		if (normalized && !result.includes(normalized)) {
			result.push(normalized);
		}
	}

	return result;
}

async function requestChatCompletion(provider, messages, { maxTokens, temperature }) {
	const headers = {
		'Content-Type': 'application/json',
	};

	if (provider.apiKey) {
		headers.Authorization = `Bearer ${provider.apiKey}`;
	} else if (requiresApiKey(provider)) {
		throw new Error('OPENAI_API_KEY is required when provider points to api.openai.com.');
	}

	const response = await fetch(provider.endpoint, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			model: provider.model,
			messages,
			temperature,
			max_tokens: maxTokens,
		}),
	});
	const text = await response.text();

	if (!response.ok) {
		throw new Error(`Chat completions request failed (${response.status}): ${text}`);
	}

	let data;
	try {
		data = JSON.parse(text);
	} catch (error) {
		throw new Error(`Invalid chat completions response JSON: ${error.message}`);
	}

	const content = data.choices?.[0]?.message?.content;
	if (typeof content !== 'string' || !content.trim()) {
		throw new Error('Chat completions response did not contain message content.');
	}

	return content.trim();
}

function isUsableProvider(provider) {
	return provider.baseUrl && provider.model && (provider.apiKey || !requiresApiKey(provider));
}

function requiresApiKey(provider) {
	return provider.endpoint.startsWith('https://api.openai.com/');
}

function getProviders({ allowDefaults = true } = {}) {
	const providerNames = parseProviderOrder();

	return providerNames.map((name) => {
		const prefix = `OPENAI_PROVIDER_${normalizeProviderName(name)}_`;
		const baseUrl = getEnv(`${prefix}BASE_URL`, allowDefaults ? process.env.OPENAI_BASE_URL : undefined);
		const model = getEnv(`${prefix}MODEL`, allowDefaults ? process.env.OPENAI_MODEL : undefined);
		const apiKey = getEnv(`${prefix}API_KEY`, allowDefaults ? process.env.OPENAI_API_KEY : undefined);

		return {
			name,
			baseUrl,
			endpoint: getChatCompletionsEndpoint(baseUrl || 'https://api.openai.com'),
			model: model || 'gpt-4o-mini',
			apiKey,
		};
	});
}

function parseProviderOrder() {
	const configured = process.env.OPENAI_PROVIDER_ORDER?.split(',').map((name) => name.trim()).filter(Boolean);
	if (configured?.length) {
		return configured;
	}

	const inferred = inferProviderOrderFromEnvKeys();
	return inferred.length ? inferred : ['default'];
}

function inferProviderOrderFromEnvKeys() {
	const providers = [];

	for (const key of getLoadedEnvKeys()) {
		const match = key.match(/^OPENAI_PROVIDER_(.+)_(API_KEY|MODEL|BASE_URL)$/);
		if (!match) {
			continue;
		}

		const name = denormalizeProviderName(match[1]);
		if (!providers.includes(name)) {
			providers.push(name);
		}
	}

	return providers;
}

function normalizeProviderName(name) {
	return name.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

function denormalizeProviderName(name) {
	return name.toLowerCase();
}

function getEnv(name, fallback) {
	const value = process.env[name]?.trim();
	return value || fallback?.trim?.() || fallback;
}

function getChatCompletionsEndpoint(baseUrlValue) {
	const baseUrl = baseUrlValue.trim().replace(/\/+$/g, '');

	if (baseUrl.endsWith('/v1')) {
		return `${baseUrl}/chat/completions`;
	}

	return `${baseUrl}/v1/chat/completions`;
}

function stripCodeFence(value) {
	return value
		.trim()
		.replace(/^```(?:json|text)?\s*/i, '')
		.replace(/\s*```$/g, '')
		.trim();
}
