from pathlib import Path
import re

path = Path('apps/web/src/shared/pages/MusicChat.tsx')
text = path.read_text(encoding='utf-8')

import_line = 'import { musicChatConversationsService } from "@/modules/musicchat/services/conversations.service";\n'
anchor = 'import { useMusicChatTriageRules } from "@/modules/musicchat/hooks/useMusicChatTriageRules";\n'
if import_line not in text:
    text = text.replace(anchor, anchor + import_line, 1)

# Remove all hardcoded support conversations/messages.
text, count = re.subn(
    r'const supportConversations: SupportConversation\[\] = \[.*?\n\];\n\nconst supportMessages: SupportMessage\[\] = \[.*?\n\];\n\n',
    '',
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit('hardcoded support data block not found exactly once')

text = text.replace(
    '  const [conversations, setConversations] = useState<SupportConversation[]>(supportConversations);\n'
    '  const [messagesByConv, setMessagesByConv] = useState<Record<string, SupportMessage[]>>({\n'
    '    [supportConversations[0]?.id ?? ""]: supportMessages,\n'
    '  });\n'
    '  const [selectedId, setSelectedId] = useState(supportConversations[0]?.id ?? "");',
    '  const [conversations, setConversations] = useState<SupportConversation[]>([]);\n'
    '  const [messagesByConv, setMessagesByConv] = useState<Record<string, SupportMessage[]>>({});\n'
    '  const [selectedId, setSelectedId] = useState("");\n'
    '  const [loadingConversations, setLoadingConversations] = useState(true);',
    1,
)

quick_anchor = '''  const quickReplyOptions = useMemo(
    () => (automationSettings?.templates?.length ? automationSettings.templates.slice(0, 3).map((template) => template.body) : quickReplies),
    [automationSettings?.templates],
  );
'''
load_effects = quick_anchor + '''

  useEffect(() => {
    let active = true;
    setLoadingConversations(true);
    void musicChatConversationsService.list()
      .then((rows) => {
        if (!active) return;
        setConversations(rows);
        setSelectedId((current) => current || rows[0]?.id || "");
      })
      .catch(() => {
        if (active) toast.error("Não foi possível carregar as conversas do MusicChat.");
      })
      .finally(() => {
        if (active) setLoadingConversations(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedId || messagesByConv[selectedId]) return;
    let active = true;
    void musicChatConversationsService.messages(selectedId)
      .then((rows) => {
        if (active) setMessagesByConv((previous) => ({ ...previous, [selectedId]: rows }));
      })
      .catch(() => {
        if (active) toast.error("Não foi possível carregar as mensagens desta conversa.");
      });
    return () => { active = false; };
  }, [selectedId, messagesByConv]);
'''
if quick_anchor not in text:
    raise SystemExit('quick reply anchor not found')
text = text.replace(quick_anchor, load_effects, 1)

# Async persisted handlers.
text = re.sub(
    r'  const handleTransfer = \(\) => \{.*?\n  \};\n\n  const handleFinalize',
    '''  const handleTransfer = async () => {
    if (!selectedConversation || !transferTarget) return;
    try {
      const updated = await musicChatConversationsService.update(selectedConversation.id, {
        metadata: { assignee_name: transferTarget },
        service_status: "em_atendimento",
      });
      setConversations((previous) => previous.map((item) => item.id === updated.id ? updated : item));
      toast.success(`Conversa transferida para ${transferTarget}.`);
      setTransferOpen(false);
      setTransferTarget("");
    } catch {
      toast.error("Não foi possível transferir a conversa.");
    }
  };

  const handleFinalize''',
    text,
    count=1,
    flags=re.S,
)
text = re.sub(
    r'  const handleFinalize = \(\) => \{.*?\n  \};\n\n  const handleArchive',
    '''  const handleFinalize = async () => {
    if (!selectedConversation) return;
    try {
      const updated = await musicChatConversationsService.close(selectedConversation.id);
      setConversations((previous) => previous.map((item) => item.id === updated.id ? updated : item));
      toast.success("Conversa finalizada.");
    } catch {
      toast.error("Não foi possível finalizar a conversa.");
    }
  };

  const handleArchive''',
    text,
    count=1,
    flags=re.S,
)
text = re.sub(
    r'  const handleArchive = \(\) => \{.*?\n  \};\n\n  const handleReopen',
    '''  const handleArchive = async () => {
    if (!selectedConversation) return;
    try {
      await musicChatConversationsService.archive(selectedConversation.id);
      setConversations((previous) => previous.filter((item) => item.id !== selectedConversation.id));
      setSelectedId("");
      toast.success("Conversa arquivada.");
    } catch {
      toast.error("Não foi possível arquivar a conversa.");
    }
  };

  const handleReopen''',
    text,
    count=1,
    flags=re.S,
)
text = re.sub(
    r'  const handleReopen = \(\) => \{.*?\n  \};\n\n  const handleAddTag',
    '''  const handleReopen = async () => {
    if (!selectedConversation) return;
    try {
      const updated = await musicChatConversationsService.reopen(selectedConversation.id);
      setConversations((previous) => previous.map((item) => item.id === updated.id ? updated : item));
      toast.success("Conversa reaberta.");
    } catch {
      toast.error("Não foi possível reabrir a conversa.");
    }
  };

  const handleAddTag''',
    text,
    count=1,
    flags=re.S,
)

text = text.replace('  const handleSend = () => {', '  const handleSend = async () => {', 1)
old_send = '''    appendMessage(selectedConversation.id, {
      id: `msg-${Date.now()}`,
      sender: "agent",
      author: selectedConversation.assignee,
      body: body || fallbackBody,
      time: sentAt,
      attachments,
    });
    updateConversation(selectedConversation.id, (conversation) => ({
      ...conversation,
      lastMessage: body || fallbackBody,
      lastMessageAt: sentAt,
    }));
    setDraft("");
    setPendingAttachments([]);'''
new_send = '''    try {
      const saved = await musicChatConversationsService.sendMessage(
        selectedConversation.id,
        body || fallbackBody,
        attachments,
      );
      appendMessage(selectedConversation.id, saved);
      updateConversation(selectedConversation.id, (conversation) => ({
        ...conversation,
        lastMessage: body || fallbackBody,
        lastMessageAt: sentAt,
      }));
      setDraft("");
      setPendingAttachments([]);
    } catch {
      toast.error("Não foi possível enviar a mensagem.");
    }'''
if old_send not in text:
    raise SystemExit('send body not found')
text = text.replace(old_send, new_send, 1)

text = text.replace('  const handleInternalNote = () => {', '  const handleInternalNote = async () => {', 1)
old_note = '''    appendMessage(selectedConversation.id, {
      id: `note-${Date.now()}`,
      sender: "system",
      author: "Nota interna",
      body,
      time: currentTimeLabel(),
    });
    toast.success("Nota interna registrada.");
    setDraft("");'''
new_note = '''    try {
      await musicChatConversationsService.addNote(selectedConversation.id, body);
      appendMessage(selectedConversation.id, {
        id: `note-${Date.now()}`,
        sender: "system",
        author: "Nota interna",
        body,
        time: currentTimeLabel(),
      });
      toast.success("Nota interna registrada.");
      setDraft("");
    } catch {
      toast.error("Não foi possível registrar a nota interna.");
    }'''
if old_note not in text:
    raise SystemExit('note body not found')
text = text.replace(old_note, new_note, 1)

# Visible real empty/loading state, not fabricated conversations.
text = text.replace(
    '              {filteredConversations.length} abertas',
    '              {loadingConversations ? "Carregando" : `${filteredConversations.length} abertas`}',
    1,
)

if 'supportConversations' in text or 'supportMessages' in text:
    raise SystemExit('hardcoded support symbols remain')

path.write_text(text, encoding='utf-8')
print('MusicChat connected to real conversations API')
