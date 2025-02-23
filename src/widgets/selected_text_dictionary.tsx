import { usePlugin, renderWidget, useTracker, SelectionType } from '@remnote/plugin-sdk';

function SelectedTextDictionary() {
  const plugin = usePlugin();
  
  const selText = useTracker(async (reactivePlugin) => {
    const sel = await reactivePlugin.editor.getSelection();
    if (sel?.type === SelectionType.Text) {
      return await plugin.richText.toString(sel.richText);
    }
    return '';
  });

  return <div>{selText}</div>;
}

renderWidget(SelectedTextDictionary);
