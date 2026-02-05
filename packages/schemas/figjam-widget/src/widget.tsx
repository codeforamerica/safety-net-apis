/**
 * Safety Net Schema Explorer - FigJam Widget
 *
 * Renders OpenAPI schemas as interactive cards on a FigJam board.
 * Users can explore fields, add structured proposals (add/remove/rename fields),
 * and export proposals as JSON for downstream processing.
 */

import type {
  SchemaBundle,
  SchemaInfo,
  SchemaField,
  Proposal,
  ProposalAction,
} from './types';

const { widget } = figma;
const {
  AutoLayout,
  Text,
  Rectangle,
  Input,
  SVG,
  useSyncedState,
  useSyncedMap,
  usePropertyMenu,
  useWidgetNodeId,
} = widget;

// --- Colors ---

const COLORS = {
  bg: '#FFFFFF',
  bgMuted: '#F8F9FA',
  bgAccent: '#EBF5FF',
  bgProposal: '#FFF8E1',
  border: '#DEE2E6',
  borderAccent: '#4A90D9',
  text: '#212529',
  textMuted: '#6C757D',
  textAccent: '#1A73E8',
  textWhite: '#FFFFFF',
  headerBg: '#1A73E8',
  addField: '#2E7D32',
  removeField: '#C62828',
  changeType: '#E65100',
  rename: '#6A1B9A',
  addEnum: '#00695C',
  question: '#F9A825',
  note: '#546E7A',
  badge: '#E53935',
};

const TYPE_COLORS: Record<string, string> = {
  string: '#1565C0',
  integer: '#6A1B9A',
  number: '#6A1B9A',
  boolean: '#2E7D32',
  object: '#E65100',
  array: '#00695C',
  date: '#AD6200',
};

const ACTION_LABELS: Record<ProposalAction, string> = {
  addField: '+ Add Field',
  removeField: '- Remove',
  changeType: '~ Type',
  rename: '~ Rename',
  addEnumValue: '+ Enum',
  question: '? Question',
  note: '# Note',
};

const ACTION_COLORS: Record<ProposalAction, string> = {
  addField: COLORS.addField,
  removeField: COLORS.removeField,
  changeType: COLORS.changeType,
  rename: COLORS.rename,
  addEnumValue: COLORS.addEnum,
  question: COLORS.question,
  note: COLORS.note,
};

// --- Helpers ---

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '...' : str;
}

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || COLORS.textMuted;
}

function formatType(field: SchemaField): string {
  if (field.ref) return field.ref;
  if (field.enum) return `enum(${field.enum.length})`;
  if (field.type === 'array') return `${field.ref || field.type}[]`;
  if (field.format) return `${field.type}:${field.format}`;
  return field.type;
}

// --- Sub-components ---

function FieldRow({
  field,
  proposals,
  onPropose,
}: {
  field: SchemaField;
  proposals: Proposal[];
  onPropose: (action: ProposalAction, fieldName: string) => void;
}) {
  const fieldProposals = proposals.filter(p => p.fieldName === field.name);
  const typeStr = formatType(field);

  return (
    <AutoLayout
      direction="horizontal"
      spacing={8}
      padding={{ left: 12, right: 12, top: 6, bottom: 6 }}
      width="fill-parent"
      verticalAlignItems="center"
      hoverStyle={{ fill: COLORS.bgMuted }}
      onClick={() => onPropose('note', field.name)}
    >
      {/* Required indicator */}
      <Text
        fontSize={10}
        fill={field.required ? COLORS.badge : 'transparent'}
        width={6}
      >
        *
      </Text>

      {/* Field name */}
      <Text
        fontSize={12}
        fontFamily="Inter"
        fontWeight={500}
        fill={COLORS.text}
        width={160}
        truncate={1}
      >
        {field.name}
      </Text>

      {/* Type badge */}
      <AutoLayout
        padding={{ left: 6, right: 6, top: 2, bottom: 2 }}
        cornerRadius={4}
        fill={COLORS.bgMuted}
      >
        <Text
          fontSize={10}
          fontFamily="Source Code Pro"
          fill={getTypeColor(field.type)}
        >
          {typeStr}
        </Text>
      </AutoLayout>

      {/* Proposal count badge */}
      {fieldProposals.length > 0 && (
        <AutoLayout
          padding={{ left: 5, right: 5, top: 2, bottom: 2 }}
          cornerRadius={8}
          fill={COLORS.bgProposal}
        >
          <Text fontSize={9} fill={COLORS.question} fontWeight={600}>
            {fieldProposals.length}
          </Text>
        </AutoLayout>
      )}
    </AutoLayout>
  );
}

function ProposalBadge({ proposal }: { proposal: Proposal }) {
  const color = ACTION_COLORS[proposal.action] || COLORS.note;

  return (
    <AutoLayout
      direction="horizontal"
      spacing={6}
      padding={{ left: 10, right: 10, top: 6, bottom: 6 }}
      width="fill-parent"
      cornerRadius={4}
      fill={COLORS.bgProposal}
    >
      {/* Action tag */}
      <AutoLayout
        padding={{ left: 4, right: 4, top: 1, bottom: 1 }}
        cornerRadius={3}
        fill={color}
      >
        <Text fontSize={9} fill={COLORS.textWhite} fontWeight={600}>
          {ACTION_LABELS[proposal.action]}
        </Text>
      </AutoLayout>

      {/* Description */}
      <Text fontSize={11} fill={COLORS.text} width={220} truncate={2}>
        {proposal.description}
      </Text>

      {/* Vote count */}
      {proposal.votes > 0 && (
        <Text fontSize={10} fill={COLORS.textMuted}>
          +{proposal.votes}
        </Text>
      )}
    </AutoLayout>
  );
}

function SectionHeader({
  title,
  count,
  expanded,
  onToggle,
}: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <AutoLayout
      direction="horizontal"
      spacing={6}
      padding={{ left: 12, right: 12, top: 8, bottom: 8 }}
      width="fill-parent"
      fill={COLORS.bgMuted}
      verticalAlignItems="center"
      onClick={onToggle}
      hoverStyle={{ fill: COLORS.bgAccent }}
    >
      <Text fontSize={10} fill={COLORS.textMuted}>
        {expanded ? '\u25BC' : '\u25B6'}
      </Text>
      <Text fontSize={11} fontWeight={600} fill={COLORS.text}>
        {title}
      </Text>
      <Text fontSize={10} fill={COLORS.textMuted}>
        ({count})
      </Text>
    </AutoLayout>
  );
}

// --- Main Widget ---

function SchemaExplorerWidget() {
  // Synced state shared across all users viewing this widget instance
  const [schemaName, setSchemaName] = useSyncedState<string>('schemaName', '');
  const [schemaData, setSchemaData] = useSyncedState<SchemaBundle | null>('schemaData', null);
  const [expanded, setExpanded] = useSyncedState<boolean>('expanded', true);
  const [expandedSections, setExpandedSections] = useSyncedState<string[]>('expandedSections', []);

  // Proposals stored in a synced map so multiple users can add concurrently
  const proposalsMap = useSyncedMap<string>('proposals');

  const nodeId = useWidgetNodeId();

  // --- Property menu (right-click options) ---

  const menuItems: WidgetPropertyMenuItem[] = [
    { itemType: 'action', propertyName: 'loadData', tooltip: 'Load schema data' },
    { itemType: 'action', propertyName: 'addProposal', tooltip: 'Add proposal' },
    { itemType: 'separator' },
    { itemType: 'action', propertyName: 'exportProposals', tooltip: 'Export proposals' },
  ];

  if (schemaData) {
    menuItems.push(
      { itemType: 'separator' },
      { itemType: 'action', propertyName: 'changeSchema', tooltip: 'Switch schema' },
    );
  }

  usePropertyMenu(menuItems, ({ propertyName }) => {
    if (propertyName === 'loadData' || propertyName === 'changeSchema') {
      openUI('load');
    } else if (propertyName === 'addProposal') {
      openUI('propose');
    } else if (propertyName === 'exportProposals') {
      openUI('export');
    }
  });

  // --- UI communication ---

  function openUI(mode: 'load' | 'propose' | 'export') {
    return new Promise<void>(() => {
      figma.showUI(__html__, { width: 420, height: 500 });

      const proposals = getAllProposals();

      figma.ui.postMessage({
        type: 'init',
        mode,
        schemaName,
        schemas: schemaData,
        proposals,
      });

      figma.ui.onmessage = (msg: any) => {
        if (msg.type === 'load-data') {
          const bundle = msg.data as SchemaBundle;
          setSchemaData(bundle);

          // Default to the first schema
          const names = Object.keys(bundle.schemas);
          if (names.length > 0 && !schemaName) {
            setSchemaName(names[0]);
          }
          figma.closePlugin();
        }

        if (msg.type === 'set-schema') {
          setSchemaName(msg.schemaName);
          figma.closePlugin();
        }

        if (msg.type === 'add-proposal') {
          const proposal: Proposal = {
            ...msg.proposal,
            id: generateId(),
            createdAt: new Date().toISOString(),
            votes: 0,
            replies: [],
          };
          proposalsMap.set(proposal.id, JSON.stringify(proposal));
          figma.notify(`Proposal added: ${ACTION_LABELS[proposal.action]}`);
        }

        if (msg.type === 'vote-proposal') {
          const raw = proposalsMap.get(msg.proposalId);
          if (raw) {
            const proposal: Proposal = JSON.parse(raw);
            proposal.votes += 1;
            proposalsMap.set(proposal.id, JSON.stringify(proposal));
          }
        }

        if (msg.type === 'close') {
          figma.closePlugin();
        }
      };
    });
  }

  function getAllProposals(): Proposal[] {
    const entries = proposalsMap.entries();
    return entries.map(([_, val]) => JSON.parse(val) as Proposal);
  }

  // --- Rendering ---

  // Empty state: no data loaded yet
  if (!schemaData || !schemaName) {
    return (
      <AutoLayout
        direction="vertical"
        spacing={12}
        padding={24}
        cornerRadius={12}
        fill={COLORS.bg}
        stroke={COLORS.border}
        strokeWidth={1}
        width={360}
        horizontalAlignItems="center"
        effect={{
          type: 'drop-shadow',
          color: { r: 0, g: 0, b: 0, a: 0.08 },
          offset: { x: 0, y: 2 },
          blur: 8,
        }}
      >
        <Text fontSize={16} fontWeight={700} fill={COLORS.text}>
          Safety Net Schema Explorer
        </Text>
        <Text fontSize={12} fill={COLORS.textMuted} horizontalAlignText="center">
          Load your schema data to start exploring.
        </Text>
        <Text fontSize={11} fill={COLORS.textMuted} horizontalAlignText="center">
          Generate data with: npm run figjam:export
        </Text>
        <AutoLayout
          padding={{ left: 16, right: 16, top: 8, bottom: 8 }}
          cornerRadius={6}
          fill={COLORS.headerBg}
          hoverStyle={{ opacity: 0.9 }}
          onClick={() => openUI('load')}
        >
          <Text fontSize={12} fontWeight={600} fill={COLORS.textWhite}>
            Load Schema Data
          </Text>
        </AutoLayout>
      </AutoLayout>
    );
  }

  // Loaded state: render the schema card
  const schema: SchemaInfo | undefined = schemaData.schemas[schemaName];
  if (!schema) {
    return (
      <AutoLayout direction="vertical" padding={16} fill={COLORS.bg} cornerRadius={8}>
        <Text fontSize={12} fill={COLORS.badge}>
          Schema "{schemaName}" not found in loaded data.
        </Text>
      </AutoLayout>
    );
  }

  const allProposals = getAllProposals();
  const schemaProposals = allProposals.filter(p => p.schemaName === schemaName);

  // Group fields by prefix (e.g., "address.line1" groups under "address")
  const groups: Record<string, SchemaField[]> = {};
  for (const field of schema.fields) {
    const parts = field.name.split('.');
    const group = parts.length > 1 ? parts[0] : '_root';
    if (!groups[group]) groups[group] = [];
    groups[group].push(field);
  }

  const groupNames = Object.keys(groups).sort((a, b) => {
    if (a === '_root') return -1;
    if (b === '_root') return 1;
    return a.localeCompare(b);
  });

  function toggleSection(name: string) {
    if (expandedSections.includes(name)) {
      setExpandedSections(expandedSections.filter(s => s !== name));
    } else {
      setExpandedSections([...expandedSections, name]);
    }
  }

  function handlePropose(action: ProposalAction, fieldName: string) {
    openUI('propose');
  }

  return (
    <AutoLayout
      direction="vertical"
      spacing={0}
      cornerRadius={12}
      fill={COLORS.bg}
      stroke={COLORS.border}
      strokeWidth={1}
      width={380}
      overflow="visible"
      effect={{
        type: 'drop-shadow',
        color: { r: 0, g: 0, b: 0, a: 0.08 },
        offset: { x: 0, y: 2 },
        blur: 8,
      }}
    >
      {/* Header */}
      <AutoLayout
        direction="horizontal"
        spacing={8}
        padding={{ left: 16, right: 16, top: 12, bottom: 12 }}
        width="fill-parent"
        fill={COLORS.headerBg}
        cornerRadius={{ topLeft: 12, topRight: 12, bottomLeft: 0, bottomRight: 0 }}
        verticalAlignItems="center"
        onClick={() => setExpanded(!expanded)}
      >
        <Text fontSize={14} fontWeight={700} fill={COLORS.textWhite}>
          {schema.name}
        </Text>
        <Text fontSize={11} fill="#FFFFFFAA">
          {schema.fields.length} fields
        </Text>
        {schemaProposals.length > 0 && (
          <AutoLayout
            padding={{ left: 6, right: 6, top: 2, bottom: 2 }}
            cornerRadius={8}
            fill="#FFFFFF33"
          >
            <Text fontSize={10} fill={COLORS.textWhite} fontWeight={600}>
              {schemaProposals.length} proposals
            </Text>
          </AutoLayout>
        )}
      </AutoLayout>

      {expanded && (
        <AutoLayout direction="vertical" spacing={0} width="fill-parent">
          {/* Description */}
          {schema.description && (
            <AutoLayout padding={{ left: 12, right: 12, top: 8, bottom: 8 }} width="fill-parent">
              <Text fontSize={11} fill={COLORS.textMuted} width="fill-parent">
                {truncate(schema.description, 120)}
              </Text>
            </AutoLayout>
          )}

          {/* Source file */}
          <AutoLayout padding={{ left: 12, right: 12, top: 4, bottom: 8 }} width="fill-parent">
            <Text fontSize={9} fill={COLORS.textMuted} fontFamily="Source Code Pro">
              {schema.source}
            </Text>
          </AutoLayout>

          {/* Divider */}
          <Rectangle width="fill-parent" height={1} fill={COLORS.border} />

          {/* Field groups */}
          {groupNames.map(groupName => {
            const fields = groups[groupName];
            const isRoot = groupName === '_root';
            const isExpanded = isRoot || expandedSections.includes(groupName);
            const displayName = isRoot ? 'Fields' : groupName.charAt(0).toUpperCase() + groupName.slice(1);

            return (
              <AutoLayout key={groupName} direction="vertical" spacing={0} width="fill-parent">
                <SectionHeader
                  title={displayName}
                  count={fields.length}
                  expanded={isExpanded}
                  onToggle={() => !isRoot && toggleSection(groupName)}
                />
                {isExpanded &&
                  fields.map(field => (
                    <FieldRow
                      key={field.name}
                      field={field}
                      proposals={schemaProposals}
                      onPropose={handlePropose}
                    />
                  ))}
              </AutoLayout>
            );
          })}

          {/* Proposals section */}
          {schemaProposals.length > 0 && (
            <AutoLayout direction="vertical" spacing={0} width="fill-parent">
              <Rectangle width="fill-parent" height={1} fill={COLORS.border} />
              <AutoLayout
                padding={{ left: 12, right: 12, top: 8, bottom: 4 }}
                width="fill-parent"
              >
                <Text fontSize={11} fontWeight={600} fill={COLORS.text}>
                  Proposals
                </Text>
              </AutoLayout>
              {schemaProposals.slice(0, 5).map(p => (
                <ProposalBadge key={p.id} proposal={p} />
              ))}
              {schemaProposals.length > 5 && (
                <AutoLayout padding={{ left: 12, right: 12, top: 4, bottom: 8 }}>
                  <Text fontSize={10} fill={COLORS.textMuted}>
                    +{schemaProposals.length - 5} more (open panel to view all)
                  </Text>
                </AutoLayout>
              )}
            </AutoLayout>
          )}

          {/* Footer actions */}
          <Rectangle width="fill-parent" height={1} fill={COLORS.border} />
          <AutoLayout
            direction="horizontal"
            spacing={8}
            padding={10}
            width="fill-parent"
            horizontalAlignItems="center"
          >
            <AutoLayout
              padding={{ left: 12, right: 12, top: 6, bottom: 6 }}
              cornerRadius={6}
              fill={COLORS.bgAccent}
              hoverStyle={{ fill: '#D6EAFF' }}
              onClick={() => openUI('propose')}
            >
              <Text fontSize={11} fontWeight={500} fill={COLORS.textAccent}>
                + Add Proposal
              </Text>
            </AutoLayout>
            <AutoLayout
              padding={{ left: 12, right: 12, top: 6, bottom: 6 }}
              cornerRadius={6}
              fill={COLORS.bgMuted}
              hoverStyle={{ fill: COLORS.border }}
              onClick={() => openUI('export')}
            >
              <Text fontSize={11} fontWeight={500} fill={COLORS.textMuted}>
                Export
              </Text>
            </AutoLayout>
          </AutoLayout>
        </AutoLayout>
      )}
    </AutoLayout>
  );
}

widget.register(SchemaExplorerWidget);
