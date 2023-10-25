import AutoNoteMover from 'main';
import { App, PluginSettingTab, Setting, ButtonComponent } from 'obsidian';

import { FolderSuggest } from 'suggests/file-suggest';
import { arrayMove } from 'utils/Utils';

export interface FolderTagPattern {
	folder: string;
	tag: string;
	pattern: string;
}

export interface ExcludedFolder {
	folder: string;
}

export interface AutoNoteMoverSettings {
	trigger_auto_manual: string;
	use_regex_to_check_for_tags: boolean;
	statusBar_trigger_indicator: boolean;
	folder_tag_pattern: Array<FolderTagPattern>;
	use_regex_to_check_for_excluded_folder: boolean;
	excluded_folder: Array<ExcludedFolder>;
	create_non_existent_folders: boolean;
}

export const DEFAULT_SETTINGS: AutoNoteMoverSettings = {
	trigger_auto_manual: 'Automatic',
	use_regex_to_check_for_tags: false,
	statusBar_trigger_indicator: true,
	folder_tag_pattern: [{ folder: '', tag: '', pattern: '' }],
	use_regex_to_check_for_excluded_folder: false,
	excluded_folder: [{ folder: '' }],
	create_non_existent_folders: false,
};

export class AutoNoteMoverSettingTab extends PluginSettingTab {
	plugin: AutoNoteMover;

	constructor(app: App, plugin: AutoNoteMover) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		this.containerEl.empty();
		this.add_auto_note_mover_setting();
	}

	add_auto_note_mover_setting(): void {
		this.containerEl.createEl('h2', { text: 'Auto Note Organizer' });

		const descEl = document.createDocumentFragment();

		new Setting(this.containerEl).setDesc(
			'Auto Note Organizer will automatically move the active notes to their respective folders according to the rules.'
		);

		const triggerDesc = document.createDocumentFragment();
		triggerDesc.append(
			'Choose how the trigger will be activated.',
			descEl.createEl('br'),
			descEl.createEl('strong', { text: 'Automatic ' }),
			'is triggered when you create, edit, or rename a note, and moves the note if it matches the rules.',
			descEl.createEl('br'),
			'You can also activate the trigger with a command.',
			descEl.createEl('br'),
			descEl.createEl('strong', { text: 'Manual ' }),
			'will not automatically move notes.',
			descEl.createEl('br'),
			'You can trigger by command.'
		);
		new Setting(this.containerEl)
			.setName('Trigger')
			.setDesc(triggerDesc)
			.addDropdown((dropDown) =>
				dropDown
					.addOption('Automatic', 'Automatic')
					.addOption('Manual', 'Manual')
					.setValue(this.plugin.settings.trigger_auto_manual)
					.onChange((value: string) => {
						this.plugin.settings.trigger_auto_manual = value;
						this.plugin.saveData(this.plugin.settings);
						this.display();
					})
			);

		// const useRegexToCheckForTags = document.createDocumentFragment();
		// useRegexToCheckForTags.append(
		// 	'If enabled, tags will be checked with regular expressions.',
		// 	descEl.createEl('br'),
		// 	'For example, if you want to match the #tag, you would write ',
		// 	descEl.createEl('strong', { text: '^#tag$' }),
		// 	descEl.createEl('br'),
		// 	'This setting is for a specific purpose, such as specifying nested tags in bulk.',
		// 	descEl.createEl('br'),
		// 	descEl.createEl('strong', {
		// 		text: 'If you want to use the suggested tags as they are, it is recommended to disable this setting.',
		// 	})
		// );
		// new Setting(this.containerEl)
		// 	.setName('Use regular expressions to check for tags')
		// 	.setDesc(useRegexToCheckForTags)
		// 	.addToggle((toggle) => {
		// 		toggle.setValue(this.plugin.settings.use_regex_to_check_for_tags).onChange(async (value) => {
		// 			this.plugin.settings.use_regex_to_check_for_tags = value;
		// 			await this.plugin.saveSettings();
		// 			this.display();
		// 		});
		// 	});

		const ruleDesc = document.createDocumentFragment();
		ruleDesc.append(
			'1. Set the destination folder.',
			descEl.createEl('br'),
			'2. Create an expression that matches the note you want to move. ',
			descEl.createEl('strong', { text: 'use and(&) or(|) not(!) and parens(()). use [] for values. `example: tag[nohash]&project[myproj]' }),
			descEl.createEl('br'),
			'3. The rules are checked in order from the top. The notes will be moved to the folder with the ',
			descEl.createEl('strong', { text: 'first matching rule.' }),
			descEl.createEl('br'),
			descEl.createEl('br'),
			'Notice:',
			descEl.createEl('br'),
			'1. Attached files will not be moved, but they will still appear in the note.',
			descEl.createEl('br'),
			'2. Auto Note Mover will not move notes that have "',
			descEl.createEl('strong', { text: 'AutoNoteMover: disable' }),
			'" in the frontmatter.'
		);
		new Setting(this.containerEl)

			.setName('Add new rule')
			.setDesc(ruleDesc)
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip('Add new rule')
					.setButtonText('+')
					.setCta()
					.onClick(async () => {
						this.plugin.settings.folder_tag_pattern.push({
							folder: '',
							tag: '',
							pattern: '',
						});
						await this.plugin.saveSettings();
						this.display();
					});
			});

		this.plugin.settings.folder_tag_pattern.forEach((folder_tag_pattern, index) => {

			const s = new Setting(this.containerEl)
				.addSearch((cb) => {
					new FolderSuggest(this.app, cb.inputEl);
					cb.setPlaceholder('Folder')
						.setValue(folder_tag_pattern.folder)
						.onChange(async (newFolder) => {
							this.plugin.settings.folder_tag_pattern[index].folder = newFolder.trim();
							await this.plugin.saveSettings();
						});
				})

				.addText((cb) => {
					// new TagSuggest(this.app, cb.inputEl);
					
					cb.setPlaceholder('Condition')
						.setValue(folder_tag_pattern.tag)
						.onChange(async (newTag) => {
							this.plugin.settings.folder_tag_pattern[index].tag = newTag.trim();
							await this.plugin.saveSettings();
						});
				})

				.addExtraButton((cb) => {
					cb.setIcon('up-chevron-glyph')
						.setTooltip('Move up')
						.onClick(async () => {
							arrayMove(this.plugin.settings.folder_tag_pattern, index, index - 1);
							await this.plugin.saveSettings();
							this.display();
						});
				})
				.addExtraButton((cb) => {
					cb.setIcon('down-chevron-glyph')
						.setTooltip('Move down')
						.onClick(async () => {
							arrayMove(this.plugin.settings.folder_tag_pattern, index, index + 1);
							await this.plugin.saveSettings();
							this.display();
						});
				})
				.addExtraButton((cb) => {
					cb.setIcon('cross')
						.setTooltip('Delete')
						.onClick(async () => {
							this.plugin.settings.folder_tag_pattern.splice(index, 1);
							await this.plugin.saveSettings();
							this.display();
						});
				});
			s.infoEl.remove();
		});

		new Setting(this.containerEl)
		.setName('Create Folders if they don\'t exist')
		.setDesc('This can be especially useful when using capture groups in the destination folder.')
		.addToggle((toggle) => {
			toggle.setValue(this.plugin.settings.create_non_existent_folders).onChange(async (value) => {
				this.plugin.settings.create_non_existent_folders = value;
				await this.plugin.saveSettings();
				this.display();
			});
		});

		const useRegexToCheckForExcludedFolder = document.createDocumentFragment();
		useRegexToCheckForExcludedFolder.append(
			'If enabled, excluded folder will be checked with regular expressions.'
		);

		new Setting(this.containerEl)
			.setName('Use regular expressions to check for excluded folder')
			.setDesc(useRegexToCheckForExcludedFolder)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.use_regex_to_check_for_excluded_folder).onChange(async (value) => {
					this.plugin.settings.use_regex_to_check_for_excluded_folder = value;
					await this.plugin.saveSettings();
					this.display();
				});
			});

		const excludedFolderDesc = document.createDocumentFragment();
		excludedFolderDesc.append(
			'Notes in the excluded folder will not be moved.',
			descEl.createEl('br'),
			'This takes precedence over the notes movement rules.'
		);
		new Setting(this.containerEl)

			.setName('Add Excluded Folder')
			.setDesc(excludedFolderDesc)
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip('Add Excluded Folders')
					.setButtonText('+')
					.setCta()
					.onClick(async () => {
						this.plugin.settings.excluded_folder.push({
							folder: '',
						});
						await this.plugin.saveSettings();
						this.display();
					});
			});

		this.plugin.settings.excluded_folder.forEach((excluded_folder, index) => {
			const s = new Setting(this.containerEl)
				.addSearch((cb) => {
					new FolderSuggest(this.app, cb.inputEl);
					cb.setPlaceholder('Folder')
						.setValue(excluded_folder.folder)
						.onChange(async (newFolder) => {
							this.plugin.settings.excluded_folder[index].folder = newFolder;
							await this.plugin.saveSettings();
						});
				})

				.addExtraButton((cb) => {
					cb.setIcon('up-chevron-glyph')
						.setTooltip('Move up')
						.onClick(async () => {
							arrayMove(this.plugin.settings.excluded_folder, index, index - 1);
							await this.plugin.saveSettings();
							this.display();
						});
				})
				.addExtraButton((cb) => {
					cb.setIcon('down-chevron-glyph')
						.setTooltip('Move down')
						.onClick(async () => {
							arrayMove(this.plugin.settings.excluded_folder, index, index + 1);
							await this.plugin.saveSettings();
							this.display();
						});
				})
				.addExtraButton((cb) => {
					cb.setIcon('cross')
						.setTooltip('Delete')
						.onClick(async () => {
							this.plugin.settings.excluded_folder.splice(index, 1);
							await this.plugin.saveSettings();
							this.display();
						});
				});
			s.infoEl.remove();
		});

		const statusBarTriggerIndicatorDesc = document.createDocumentFragment();
		statusBarTriggerIndicatorDesc.append(
			'The status bar will display [A] if the trigger is Automatic, and [M] for Manual.',
			descEl.createEl('br'),
			'To change the setting, you need to restart Obsidian.',
			descEl.createEl('br'),
			'Desktop only.'
		);
		new Setting(this.containerEl)
			.setName('Status Bar Trigger Indicator')
			.setDesc(statusBarTriggerIndicatorDesc)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.statusBar_trigger_indicator).onChange(async (value) => {
					this.plugin.settings.statusBar_trigger_indicator = value;
					await this.plugin.saveSettings();
					this.display();
				});
			});
	}
}
