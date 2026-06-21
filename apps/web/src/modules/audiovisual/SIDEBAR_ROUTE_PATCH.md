# Patch obrigatório no Sidebar / Rotas globais

O ZIP contém o módulo audiovisual ajustado para funcionar como módulo geral único.
Para finalizar a remoção do submenu no Sidebar, aplique esta alteração no arquivo global onde o menu lateral é definido.

## Antes

```ts
{
  label: "Audiovisual",
  icon: Film,
  children: [
    { label: "Dashboard", href: "/audiovisual/dashboard" },
    { label: "Projetos", href: "/audiovisual/projects" },
  ],
}
```

## Depois

```ts
{
  label: "Audiovisual",
  icon: Film,
  href: "/audiovisual",
}
```

## Rotas globais

A rota principal deve apontar diretamente para `AudiovisualProjectsList`.

```tsx
<Route path="/audiovisual" element={<AudiovisualProjectsList />} />
```

Rotas antigas, se ainda existirem, podem redirecionar para `/audiovisual` para evitar quebra:

```tsx
<Route path="/audiovisual/dashboard" element={<Navigate to="/audiovisual" replace />} />
<Route path="/audiovisual/projects" element={<Navigate to="/audiovisual" replace />} />
```
