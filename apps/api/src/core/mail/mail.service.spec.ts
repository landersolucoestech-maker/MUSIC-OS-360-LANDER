import { Test }        from '@nestjs/testing';
import { MailService, escapeHtml } from './mail.service';
import { ConfigService } from '@nestjs/config';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('MailService', () => {
  let service: MailService;

  const makeModule = async (hasKey = true) => {
    const m = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) => {
              if (k === 'RESEND_API_KEY')    return hasKey ? 're_test' : undefined;
              if (k === 'RESEND_FROM_EMAIL') return 'noreply@test.com';
            },
          },
        },
      ],
    }).compile();
    return m.get<MailService>(MailService);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    service = await makeModule(true);
  });

  it('chama Resend API com Authorization header correto', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'email_1' }),
    });
    const r = await service.send({ to: 'x@x.com', subject: 'T', html: '<p>H</p>' });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer re_test' }),
      }),
    );
    expect(r.id).toBe('email_1');
  });

  it('retorna skipped:true quando sem API key', async () => {
    const svc = await makeModule(false);
    const r = await svc.send({ to: 'x@x.com', subject: 'T', html: '<p>H</p>' });
    expect(r).toEqual({ skipped: true });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('welcomeHtml contém o nome do usuário', () => {
    const html = service.welcomeHtml('João');
    expect(html).toContain('João');
    expect(html).toMatch(/<html/i);
  });

  it('contractExpiringHtml contém título e dias', () => {
    const html = service.contractExpiringHtml('Contrato XYZ', 7);
    expect(html).toContain('Contrato XYZ');
    expect(html).toContain('7');
  });

  describe('escapeHtml (MAIL-01)', () => {
    it('escapa os 5 caracteres HTML-significativos', () => {
      expect(escapeHtml(`<img src=x onerror="alert('xss')">&`)).toBe(
        '&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;&amp;',
      );
    });

    it('welcomeHtml neutraliza markup injetado no nome do usuário', () => {
      const html = service.welcomeHtml('<img src=x onerror=alert(1)>');
      expect(html).not.toContain('<img src=x onerror=alert(1)>');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('contractExpiringHtml neutraliza markup injetado no título do contrato', () => {
      const html = service.contractExpiringHtml('<script>alert(1)</script>', 7);
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });
  });
});
