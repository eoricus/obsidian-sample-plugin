import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

import { OpenAI } from "openai";
import { findSentenceEnd, findSentenceStart } from "utils";

interface PluginSettings {
	API_KEY: string;
	BASE_URL: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
	API_KEY: "Your API key",
	BASE_URL: "https://api.openai.com/v1",
};

const getSystemPrompt = (keyWord: string, sentence: string): string => {
	return `
Your task is to adjust the declension of the entire sentence to match the grammatical declension of the provided word. Ensure that you do not change the words in the sentence, its meaning, or essence. Only alter the inflection of the sentence to match the given word’s declension.
Here is the sentence:
"""
${sentence}
"""

The given word whose declension needs to be matched:
"""
${keyWord}
"""

Please adjust the sentence accordingly.
`.trim();
};

export default class MyPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		const openai = new OpenAI({
			apiKey: this.settings.API_KEY,
			baseURL: this.settings.BASE_URL,
			dangerouslyAllowBrowser: true,
		});

		this.addCommand({
			id: "fix-declination-with-ai",
			name: "fix-declination-with-ai",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const cursor = editor.getCursor();
				const lineText = editor.getLine(cursor.line);

				const keyWord = editor.getSelection();

				const sentenceStart = findSentenceStart(lineText, cursor.ch);
				const sentenceEnd = findSentenceEnd(lineText, cursor.ch);

				const sentence = lineText
					.slice(sentenceStart, sentenceEnd)
					.trim();

				const from = { line: cursor.line, ch: sentenceStart };
				const to = { line: cursor.line, ch: sentenceEnd };

				editor.setSelection(from, to);

				new Notice(`"${JSON.stringify(this.settings)} "`);

				try {
					const completion = await openai.chat.completions.create({
						messages: [
							{
								role: "system",
								content: getSystemPrompt(keyWord, sentence),
							},
						],
						model: "gpt-3.5-turbo",
					});

					const fixedSentence = completion.choices[0].message.content;
					new Notice(`Error: ${fixedSentence}`);

					if (!fixedSentence) {
						throw new Error("Error: Unable to fix the sentence.");
					}

					editor.replaceSelection(fixedSentence);
				} catch (error) {
					new Notice(`Error: ${error.message}`);
				}

				new Notice(JSON.stringify(this.settings.BASE_URL));

				// TO-DO: сообщение о потраченных токенах
				// new Notice(`Captured Sentence: "${sentence}"`);
			},
			hotkeys: [
				{
					modifiers: ["Ctrl"],
					key: "D",
				},
			],
		});

		this.addSettingTab(new DeclineFixerSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class DeclineFixerModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class DeclineFixerSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Base URL")
			.setDesc("Your AI service URL")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.BASE_URL)
					.onChange(async (value) => {
						this.plugin.settings.BASE_URL = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("API key")
			.setDesc("Your AI service API key")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.API_KEY)
					.onChange(async (value) => {
						this.plugin.settings.API_KEY = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
