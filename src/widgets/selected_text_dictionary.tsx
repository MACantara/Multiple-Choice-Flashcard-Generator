import React from 'react';
import { usePlugin, renderWidget, useTracker, SelectionType, RNPlugin } from '@remnote/plugin-sdk';
import { WordData, GroupedDefinition } from '../models';
import { PreviewDefinitions } from '../components/PreviewDefinitions';

// Helper to clean the selected text to a single word.
function cleanSelectedText(s?: string) {
  return s
    ?.trim()
    ?.split(/(\s+)/)[0]
    ?.replaceAll(/[^a-zA-Z]/g, '');
}

// Debounce hook to limit API calls.
export function useDebounce<T>(value: T, msDelay: number) {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, msDelay);
    return () => clearTimeout(handler);
  }, [value, msDelay]);
  return debouncedValue;
}

// New function to add the selected definition as a Rem.
async function addSelectedDefinition(plugin: RNPlugin, definition: GroupedDefinition): Promise<void> {
  const rootRemName = (await plugin.settings.getSetting('dictionary root')) as string;
  if (!rootRemName) {
    plugin.app.toast('You need to set the Dictionary Root Rem setting!');
    return;
  }
  const rootRem = await plugin.rem.findByName([rootRemName], null);
  if (!rootRem) {
    plugin.app.toast('Failed to find the root rem');
    return;
  }
  const word = `${definition.word} (${definition.partOfSpeech})`;
  const definitions = definition.meanings
    .map((meaning) => meaning.definitions.map((def) => def.definition))
    .flat();
  const wordRem = await plugin.rem.createRem();
  if (wordRem) {
    await wordRem.setText([word]);
    for (const def of definitions) {
      const child = await plugin.rem.createRem();
      await child?.setText([def]);
      await child?.setParent(wordRem._id);
      await child?.setIsCardItem(true);
    }
    await wordRem.setParent(rootRem._id);
    await wordRem.setPracticeDirection('both');
    plugin.app.toast('Added!');
  } else {
    plugin.app.toast('Failed to save the word to your knowledge base.');
  }
}

function SelectedTextDictionary() {
  const plugin = usePlugin();
  // Set wordData type to WordData | null for safety.
  const [wordData, setWordData] = React.useState<WordData | null>(null);

  // Debounce the selected text obtained via useTracker.
  const searchTerm = useDebounce(
    useTracker(async (reactivePlugin) => {
      const sel = await reactivePlugin.editor.getSelection();
      if (sel?.type === SelectionType.Text) {
        return cleanSelectedText(await plugin.richText.toString(sel.richText));
      }
      return undefined;
    }),
    500
  );

  // Update wordData state when the debounced search term changes.
  React.useEffect(() => {
    const getAndSetData = async () => {
      if (!searchTerm) return;
      try {
        const url = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
        const response = await fetch(url + searchTerm);
        const json = await response.json();
        setWordData(Array.isArray(json) ? json[0] : null);
      } catch (e) {
        console.log('Error getting dictionary info:', e);
      }
    };
    getAndSetData();
  }, [searchTerm]);

  return (
    <div className="min-h-[200px] max-h-[500px] overflow-y-scroll m-4">
      {wordData && (
        <PreviewDefinitions wordData={wordData} onSelectDefinition={(d) => addSelectedDefinition(plugin, d)} />
      )}
    </div>
  );
}

renderWidget(SelectedTextDictionary);
