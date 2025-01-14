/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiSearchBarProps,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  DocumentEntry,
  DocumentEntryType,
  IndexEntry,
  IndexEntryType,
  KnowledgeBaseEntryCreateProps,
  KnowledgeBaseEntryResponse,
} from '@kbn/elastic-assistant-common';
import { AlertsSettingsManagement } from '../../alerts/settings/alerts_settings_management';
import { useKnowledgeBaseEntries } from '../../assistant/api/knowledge_base/entries/use_knowledge_base_entries';
import { useAssistantContext } from '../../assistant_context';
import { useKnowledgeBaseTable } from './use_knowledge_base_table';
import { AssistantSettingsBottomBar } from '../../assistant/settings/assistant_settings_bottom_bar';
import {
  useSettingsUpdater,
  DEFAULT_CONVERSATIONS,
  DEFAULT_PROMPTS,
} from '../../assistant/settings/use_settings_updater/use_settings_updater';
import { AddEntryButton } from './add_entry_button';
import * as i18n from './translations';
import { Flyout } from '../../assistant/common/components/assistant_settings_management/flyout';
import { useFlyoutModalVisibility } from '../../assistant/common/components/assistant_settings_management/flyout/use_flyout_modal_visibility';
import { IndexEntryEditor } from './index_entry_editor';
import { DocumentEntryEditor } from './document_entry_editor';
import { KnowledgeBaseSettings } from '../knowledge_base_settings';
import { SetupKnowledgeBaseButton } from '../setup_knowledge_base_button';
import { useDeleteKnowledgeBaseEntries } from '../../assistant/api/knowledge_base/entries/use_delete_knowledge_base_entries';
import {
  isEsqlSystemEntry,
  isKnowledgeBaseEntryCreateProps,
  isKnowledgeBaseEntryResponse,
} from './helpers';
import { useCreateKnowledgeBaseEntry } from '../../assistant/api/knowledge_base/entries/use_create_knowledge_base_entry';
import { useUpdateKnowledgeBaseEntries } from '../../assistant/api/knowledge_base/entries/use_update_knowledge_base_entries';
import { SETTINGS_UPDATED_TOAST_TITLE } from '../../assistant/settings/translations';

export const KnowledgeBaseSettingsManagement: React.FC = React.memo(() => {
  const {
    assistantFeatures: { assistantKnowledgeBaseByDefault: enableKnowledgeBaseByDefault },
    http,
    toasts,
  } = useAssistantContext();
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // Only needed for legacy settings management
  const { knowledgeBase, setUpdatedKnowledgeBaseSettings, resetSettings, saveSettings } =
    useSettingsUpdater(
      DEFAULT_CONVERSATIONS, // Knowledge Base settings do not require conversations
      DEFAULT_PROMPTS, // Knowledge Base settings do not require prompts
      false, // Knowledge Base settings do not require conversations
      false // Knowledge Base settings do not require prompts
    );

  const handleUpdateKnowledgeBaseSettings = useCallback(
    (updatedKnowledgeBase) => {
      setHasPendingChanges(true);
      setUpdatedKnowledgeBaseSettings(updatedKnowledgeBase);
    },
    [setUpdatedKnowledgeBaseSettings]
  );

  const handleSave = useCallback(
    async (param?: { callback?: () => void }) => {
      await saveSettings();
      toasts?.addSuccess({
        iconType: 'check',
        title: SETTINGS_UPDATED_TOAST_TITLE,
      });
      setHasPendingChanges(false);
      param?.callback?.();
    },
    [saveSettings, toasts]
  );

  const onCancelClick = useCallback(() => {
    resetSettings();
    setHasPendingChanges(false);
  }, [resetSettings]);

  const onSaveButtonClicked = useCallback(() => {
    handleSave();
  }, [handleSave]);

  const { isFlyoutOpen: isFlyoutVisible, openFlyout, closeFlyout } = useFlyoutModalVisibility();

  const [selectedEntry, setSelectedEntry] =
    useState<Partial<DocumentEntry | IndexEntry | KnowledgeBaseEntryCreateProps>>();

  // CRUD API accessors
  const { mutate: createEntry, isLoading: isCreatingEntry } = useCreateKnowledgeBaseEntry({
    http,
    toasts,
  });
  const { mutate: updateEntries, isLoading: isUpdatingEntries } = useUpdateKnowledgeBaseEntries({
    http,
    toasts,
  });
  const { mutate: deleteEntry, isLoading: isDeletingEntries } = useDeleteKnowledgeBaseEntries({
    http,
    toasts,
  });
  const isModifyingEntry = isCreatingEntry || isUpdatingEntries || isDeletingEntries;

  // Flyout Save/Cancel Actions
  const onSaveConfirmed = useCallback(() => {
    if (isKnowledgeBaseEntryCreateProps(selectedEntry)) {
      createEntry(selectedEntry);
      closeFlyout();
    } else if (isKnowledgeBaseEntryResponse(selectedEntry)) {
      updateEntries([selectedEntry]);
      closeFlyout();
    }
  }, [closeFlyout, selectedEntry, createEntry, updateEntries]);

  const onSaveCancelled = useCallback(() => {
    setSelectedEntry(undefined);
    closeFlyout();
  }, [closeFlyout]);

  const { data: entries } = useKnowledgeBaseEntries({
    http,
    toasts,
    enabled: enableKnowledgeBaseByDefault,
  });
  const { getColumns } = useKnowledgeBaseTable();
  const columns = useMemo(
    () =>
      getColumns({
        onEntryNameClicked: ({ id }: KnowledgeBaseEntryResponse) => {
          const entry = entries.data.find((e) => e.id === id);
          setSelectedEntry(entry);
          openFlyout();
        },
        onSpaceNameClicked: ({ namespace }: KnowledgeBaseEntryResponse) => {
          openFlyout();
        },
        isDeleteEnabled: (entry: KnowledgeBaseEntryResponse) => {
          return !isEsqlSystemEntry(entry);
        },
        onDeleteActionClicked: ({ id }: KnowledgeBaseEntryResponse) => {
          deleteEntry({ ids: [id] });
        },
        isEditEnabled: (entry: KnowledgeBaseEntryResponse) => {
          return !isEsqlSystemEntry(entry);
        },
        onEditActionClicked: ({ id }: KnowledgeBaseEntryResponse) => {
          const entry = entries.data.find((e) => e.id === id);
          setSelectedEntry(entry);
          openFlyout();
        },
      }),
    [deleteEntry, entries.data, getColumns, openFlyout]
  );

  const onDocumentClicked = useCallback(() => {
    setSelectedEntry({ type: DocumentEntryType.value, kbResource: 'user', source: 'user' });
    openFlyout();
  }, [openFlyout]);

  const onIndexClicked = useCallback(() => {
    setSelectedEntry({ type: IndexEntryType.value });
    openFlyout();
  }, [openFlyout]);

  const search: EuiSearchBarProps = useMemo(
    () => ({
      toolsRight: (
        <AddEntryButton onDocumentClicked={onDocumentClicked} onIndexClicked={onIndexClicked} />
      ),
      box: {
        incremental: true,
        placeholder: i18n.SEARCH_PLACEHOLDER,
      },
      filters: [],
    }),
    [onDocumentClicked, onIndexClicked]
  );

  const flyoutTitle = useMemo(() => {
    // @ts-expect-error TS doesn't understand that selectedEntry is a partial
    if (selectedEntry?.id != null) {
      return selectedEntry.type === DocumentEntryType.value
        ? i18n.EDIT_DOCUMENT_FLYOUT_TITLE
        : i18n.EDIT_INDEX_FLYOUT_TITLE;
    }
    return selectedEntry?.type === DocumentEntryType.value
      ? i18n.NEW_DOCUMENT_FLYOUT_TITLE
      : i18n.NEW_INDEX_FLYOUT_TITLE;
  }, [selectedEntry]);

  if (!enableKnowledgeBaseByDefault) {
    return (
      <>
        <KnowledgeBaseSettings
          knowledgeBase={knowledgeBase}
          setUpdatedKnowledgeBaseSettings={handleUpdateKnowledgeBaseSettings}
        />
        <AssistantSettingsBottomBar
          hasPendingChanges={hasPendingChanges}
          onCancelClick={onCancelClick}
          onSaveButtonClicked={onSaveButtonClicked}
        />
      </>
    );
  }

  const sorting = {
    sort: {
      field: 'name',
      direction: 'desc' as const,
    },
  };

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder paddingSize="l">
        <EuiText size={'m'}>
          <FormattedMessage
            id="xpack.elasticAssistant.assistant.settings.knowledgeBasedSettingManagements.knowledgeBaseDescription"
            defaultMessage="The AI Assistant uses Elastic's ELSER model to semantically search your data sources and feed that context to an LLM. Import knowledge bases like Runbooks, GitHub issues, and others for more accurate, personalized assistance. {learnMore}."
            values={{
              learnMore: (
                <EuiLink
                  external
                  href="https://www.elastic.co/guide/en/security/current/security-assistant.html"
                  target="_blank"
                >
                  {i18n.KNOWLEDGE_BASE_DOCUMENTATION}
                </EuiLink>
              ),
            }}
          />
          <SetupKnowledgeBaseButton display={'mini'} />
        </EuiText>
        <EuiSpacer size="l" />
        <EuiInMemoryTable
          columns={columns}
          items={entries.data ?? []}
          search={search}
          sorting={sorting}
        />
      </EuiPanel>
      <EuiSpacer size="m" />
      <AlertsSettingsManagement
        knowledgeBase={knowledgeBase}
        setUpdatedKnowledgeBaseSettings={handleUpdateKnowledgeBaseSettings}
      />
      <AssistantSettingsBottomBar
        hasPendingChanges={hasPendingChanges}
        onCancelClick={onCancelClick}
        onSaveButtonClicked={onSaveButtonClicked}
      />
      <Flyout
        flyoutVisible={isFlyoutVisible}
        title={flyoutTitle}
        onClose={onSaveCancelled}
        onSaveCancelled={onSaveCancelled}
        onSaveConfirmed={onSaveConfirmed}
        saveButtonDisabled={!isKnowledgeBaseEntryCreateProps(selectedEntry) || isModifyingEntry} // TODO: KB-RBAC disable for global entries if user doesn't have global RBAC
      >
        <>
          {selectedEntry?.type === DocumentEntryType.value ? (
            <DocumentEntryEditor
              entry={selectedEntry as DocumentEntry}
              setEntry={
                setSelectedEntry as React.Dispatch<React.SetStateAction<Partial<DocumentEntry>>>
              }
            />
          ) : (
            <IndexEntryEditor
              entry={selectedEntry as IndexEntry}
              setEntry={
                setSelectedEntry as React.Dispatch<React.SetStateAction<Partial<IndexEntry>>>
              }
            />
          )}
        </>
      </Flyout>
    </>
  );
});

KnowledgeBaseSettingsManagement.displayName = 'KnowledgeBaseSettingsManagement';
