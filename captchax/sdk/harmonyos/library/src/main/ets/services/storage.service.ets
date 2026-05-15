import dataPreferences from '@ohos.data.preferences';

export class StorageService {
  private preferences: dataPreferences.Preferences | null = null;
  private readonly preferencesName = 'captchax_storage';

  async init(context: any): Promise<void> {
    try {
      this.preferences = await dataPreferences.Preferences.getPreferences(context, this.preferencesName);
    } catch (error) {
      console.error('Failed to init preferences:', error);
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.preferences) {
      return;
    }
    try {
      await this.preferences.put(key, value);
      await this.preferences.flush();
    } catch (error) {
      console.error('Failed to set preference:', error);
    }
  }

  async get(key: string, defaultValue?: string): Promise<string | undefined> {
    if (!this.preferences) {
      return defaultValue;
    }
    try {
      return await this.preferences.get(key, defaultValue);
    } catch (error) {
      console.error('Failed to get preference:', error);
      return defaultValue;
    }
  }

  async remove(key: string): Promise<void> {
    if (!this.preferences) {
      return;
    }
    try {
      await this.preferences.delete(key);
      await this.preferences.flush();
    } catch (error) {
      console.error('Failed to remove preference:', error);
    }
  }

  async clear(): Promise<void> {
    if (!this.preferences) {
      return;
    }
    try {
      await this.preferences.clear();
      await this.preferences.flush();
    } catch (error) {
      console.error('Failed to clear preferences:', error);
    }
  }
}
