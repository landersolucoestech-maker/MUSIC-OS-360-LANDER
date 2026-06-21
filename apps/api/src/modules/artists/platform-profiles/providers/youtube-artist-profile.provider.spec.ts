import { ConfigService } from '@nestjs/config';
import { YouTubeArtistProfileProvider } from './youtube-artist-profile.provider';

describe('YouTubeArtistProfileProvider.parseRef', () => {
  const provider = new YouTubeArtistProfileProvider(new ConfigService());

  it('parses a /channel/UC… URL into a channel id', () => {
    expect(provider.parseRef('https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv'))
      .toEqual({ kind: 'id', value: 'UCabcdefghijklmnopqrstuv' });
  });

  it('parses a bare UC… id', () => {
    expect(provider.parseRef('UCabcdefghijklmnopqrstuv'))
      .toEqual({ kind: 'id', value: 'UCabcdefghijklmnopqrstuv' });
  });

  it('parses an @handle URL', () => {
    expect(provider.parseRef('https://youtube.com/@MusicOS360'))
      .toEqual({ kind: 'handle', value: 'MusicOS360' });
  });

  it('parses a bare @handle (no URL)', () => {
    expect(provider.parseRef('@MusicOS360'))
      .toEqual({ kind: 'handle', value: 'MusicOS360' });
  });

  it('parses a legacy /user/NAME URL', () => {
    expect(provider.parseRef('https://www.youtube.com/user/SomeArtist'))
      .toEqual({ kind: 'username', value: 'SomeArtist' });
  });

  it('parses a custom /c/NAME URL', () => {
    expect(provider.parseRef('https://www.youtube.com/c/SomeArtist'))
      .toEqual({ kind: 'custom', value: 'SomeArtist' });
  });

  it('parses a bare legacy custom name', () => {
    expect(provider.parseRef('https://www.youtube.com/SomeArtist'))
      .toEqual({ kind: 'custom', value: 'SomeArtist' });
  });

  it('handles trailing slashes and query strings', () => {
    expect(provider.parseRef('https://www.youtube.com/@MusicOS360/videos?x=1'))
      .toEqual({ kind: 'handle', value: 'MusicOS360' });
  });

  it('returns null for empty/invalid input', () => {
    expect(provider.parseRef('')).toBeNull();
    expect(provider.parseRef('   ')).toBeNull();
    expect(provider.parseRef(null as unknown as string)).toBeNull();
  });
});
