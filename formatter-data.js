/* Shared sample streams and formatter presets (used by formatter.html and regex.html). */
(function () {
'use strict';
  /* ------------------------------------------------------------- samples */
  var USER = { languages: ['English'], subtitles: ['English'], resolutions: ['2160p', '1080p', '720p'], qualities: [], visualTags: [], audioTags: [], audioChannels: [], encodes: [], streamTypes: [], releaseGroups: [], keywords: [] };
  var SAMPLES = [
    { label: 'Movie 4K', data: {
      addon: { name: 'Torrentio' }, config: { addonName: 'Torrentio' },
      service: { id: 'realdebrid', shortName: 'RD', name: 'Real-Debrid', cached: true },
      stream: { filename: 'Dune.Part.Two.2024.2160p.UHD.BluRay.REMUX.DV.HDR10.HEVC.TrueHD.Atmos.7.1-FraMeSToR.mkv', folderName: 'Dune.Part.Two.2024.2160p.UHD.BluRay.REMUX', size: 62400000000, bitrate: 52000000, duration: 9960000, quality: 'BluRay REMUX', resolution: '2160p', visualTags: ['DV', 'HDR10'], audioTags: ['TrueHD', 'Atmos'], audioChannels: ['7.1'], encode: 'HEVC', releaseGroup: 'FraMeSToR', languages: ['English'], languageEmojis: ['🇬🇧'], languageCodes: ['EN'], subtitles: ['English', 'French'], subtitleEmojis: ['🇬🇧', '🇫🇷'], title: 'Dune Part Two', year: '2024', seeders: 142, indexer: 'Knaben', type: 'debrid', library: false, proxied: false, private: false, seasonPack: false, age: '3d', edition: null },
      metadata: { queryType: 'movie' }, user: USER } },
    { label: 'Series 1080p', data: {
      addon: { name: 'Comet' }, config: { addonName: 'Comet' },
      service: { id: 'torbox', shortName: 'TB', name: 'TorBox', cached: true },
      stream: { filename: 'The.Bear.S03E05.1080p.WEB-DL.DDP5.1.H.264-NTb.mkv', size: 2100000000, bitrate: 6200000, duration: 2220000, quality: 'WEB-DL', resolution: '1080p', visualTags: [], audioTags: ['DD+'], audioChannels: ['5.1'], encode: 'AVC', releaseGroup: 'NTb', languages: ['English', 'French', 'Spanish'], languageEmojis: ['🇬🇧', '🇫🇷', '🇪🇸'], languageCodes: ['EN', 'FR', 'ES'], subtitles: ['English'], subtitleEmojis: ['🇬🇧'], title: 'The Bear', year: '2022', seasons: [3], episodes: [5], seasonEpisode: ['S03', 'E05'], formattedSeasons: 'S03', formattedEpisodes: 'E05', seasonPack: false, seeders: 56, indexer: 'EZTV', type: 'debrid', library: true, proxied: false, private: false, network: 'FX' },
      metadata: { queryType: 'series' }, user: USER } },
    { label: 'Anime BD', data: {
      addon: { name: 'Nyaa' }, config: { addonName: 'Nyaa' },
      service: { id: 'alldebrid', shortName: 'AD', name: 'AllDebrid', cached: true },
      stream: { filename: '[Group] Frieren - 12 [BD 1080p HEVC 10bit Dual Audio FLAC].mkv', folderName: '[Group] Frieren (BD 1080p)', size: 9800000000, quality: 'BluRay', resolution: '1080p', visualTags: ['10bit'], audioTags: ['FLAC'], audioChannels: ['2.0'], encode: 'HEVC', releaseGroup: 'Group', languages: ['Japanese', 'English'], languageEmojis: ['🇯🇵', '🇬🇧'], languageCodes: ['JA', 'EN'], subtitles: ['English'], subtitleEmojis: ['🇬🇧'], title: 'Frieren', seasonEpisode: ['S01', 'E12'], seasonPack: true, folderSize: 98000000000, seeders: 31, indexer: 'Nyaa', type: 'debrid', library: false, proxied: false, private: false, seadex: true, seadexBest: true },
      metadata: { queryType: 'anime' }, user: USER } },
    { label: 'Uncached 720p', data: {
      addon: { name: 'Torrentio' }, config: { addonName: 'Torrentio' },
      service: { id: 'realdebrid', shortName: 'RD', name: 'Real-Debrid', cached: false },
      stream: { filename: 'Old.Movie.1998.720p.BluRay.x264-GRP.mkv', size: 1400000000, quality: 'BluRay', resolution: '720p', visualTags: [], audioTags: ['AAC'], audioChannels: ['2.0'], encode: 'AVC', releaseGroup: 'GRP', languages: ['English'], languageEmojis: ['🇬🇧'], title: 'Old Movie', year: '1998', seeders: 8, indexer: 'ThePirateBay', type: 'p2p', library: false, proxied: false, private: false, message: 'Download required' },
      metadata: { queryType: 'movie' }, user: USER } },
    { label: 'Sparse', data: {
      addon: { name: 'Some Addon' }, config: { addonName: 'Some Addon' },
      service: { id: null, shortName: null, name: null, cached: null },
      stream: { filename: 'video.mp4', type: 'http', library: false, proxied: true, private: false },
      metadata: { queryType: 'movie' }, user: USER } },
    { label: '4K WEB-DL', data: {
      addon: { name: 'Comet' }, config: { addonName: 'Comet' },
      service: { id: 'torbox', shortName: 'TB', name: 'TorBox', cached: true },
      stream: { filename: 'Dune.Part.Two.2024.2160p.WEB-DL.DDP5.1.Atmos.HDR10+.H.265-FLUX.mkv', size: 24500000000, bitrate: 21000000, duration: 9960000, quality: 'WEB-DL', resolution: '2160p', visualTags: ['HDR10+'], audioTags: ['DD+', 'Atmos'], audioChannels: ['5.1'], encode: 'HEVC', releaseGroup: 'FLUX', languages: ['English'], languageEmojis: ['\ud83c\uddec\ud83c\udde7'], languageCodes: ['EN'], title: 'Dune Part Two', year: '2024', seeders: 80, indexer: 'Jackett', type: 'debrid', library: false, proxied: false, private: false },
      metadata: { queryType: 'movie' }, user: USER } },
    { label: '1080p BluRay', data: {
      addon: { name: 'MediaFusion' }, config: { addonName: 'MediaFusion' },
      service: { id: 'realdebrid', shortName: 'RD', name: 'Real-Debrid', cached: true },
      stream: { filename: 'Dune.Part.Two.2024.1080p.BluRay.x264.DTS-HD.MA.5.1-HiFi.mkv', size: 14000000000, bitrate: 11000000, duration: 9960000, quality: 'BluRay', resolution: '1080p', visualTags: [], audioTags: ['DTS-HD MA'], audioChannels: ['5.1'], encode: 'AVC', releaseGroup: 'HiFi', languages: ['English'], languageEmojis: ['\ud83c\uddec\ud83c\udde7'], languageCodes: ['EN'], title: 'Dune Part Two', year: '2024', seeders: 210, indexer: 'ThePirateBay', type: 'debrid', library: false, proxied: false, private: false },
      metadata: { queryType: 'movie' }, user: USER } },
    { label: 'CAM rip', data: {
      addon: { name: 'Torrentio' }, config: { addonName: 'Torrentio' },
      service: { id: 'realdebrid', shortName: 'RD', name: 'Real-Debrid', cached: true },
      stream: { filename: 'Dune.Part.Two.2024.1080p.HDCAM.x264-GRP.mkv', size: 2200000000, quality: 'CAM', resolution: '1080p', visualTags: [], audioTags: ['AAC'], audioChannels: ['2.0'], encode: 'AVC', releaseGroup: 'GRP', languages: ['English'], languageEmojis: ['\ud83c\uddec\ud83c\udde7'], languageCodes: ['EN'], title: 'Dune Part Two', year: '2024', seeders: 400, indexer: 'ThePirateBay', type: 'debrid', library: false, proxied: false, private: false },
      metadata: { queryType: 'movie' }, user: USER } }
  ];

  /* ------------------------------------------------------------- presets */
  var PRESETS = [
    { id: 'compact', label: 'Compact', about: 'Cache icon, addon, resolution. Four short lines.',
      name: '{service.cached["⚡"||"⏳"]} {addon.name}{? {stream.resolution}?}',
      desc: "{?{stream.title::title}?}{? ({stream.year})?}{? {stream.seasonEpisode::join(' · ')}?}\n{?{stream.quality}?}{? · {stream.encode}?}{? · {stream.visualTags::join(' · ')}?}\n{stream.size::>0[\"{stream.size::sbytes}\"||\"\"]}{? · 👥 {stream.seeders}?}{? · {stream.indexer}?}\n{?{stream.languageEmojis::join(' ')}?}" },
    { id: 'detailed', label: 'Detailed', about: 'Everything useful, one emoji per fact.',
      name: '{stream.proxied["🕵️ "||""]}{service.cached["⚡"||"⏳"]} {addon.name}{service.id::exists[" [{service.shortName}]"||""]}\n{?{stream.resolution}?}',
      desc: "{?🎬 {stream.title::title}?}{? ({stream.year})?}{? {stream.seasonEpisode::join('')}?}\n{?🎥 {stream.quality} ?}{?🎞️ {stream.encode} ?}{?📺 {stream.visualTags::join(' | ')} ?}\n{?🎧 {stream.audioTags::join(' | ')} ?}{?🔊 {stream.audioChannels::join(' | ')}?}\n{stream.size::>0[\"📦 {stream.size::sbytes} \"||\"\"]}{stream.seeders::>0[\"👥 {stream.seeders} \"||\"\"]}{?🔍 {stream.indexer}?}\n{?🌎 {stream.languageEmojis::join(' ')}?}{?  📝 {stream.subtitleEmojis::join(' ')}?}\n{?🏷️ {stream.releaseGroup}?}\n{?ℹ️ {stream.message}?}" },
    { id: 'badge', label: 'Badge-friendly', about: 'Skips what Chip badges already show: resolution, source, HDR, audio, codec, language.',
      name: '{service.cached["⚡"||"⏳"]} {addon.name}',
      desc: "{?{stream.title::title}?}{? ({stream.year})?}{? {stream.seasonEpisode::join(' · ')}?}\n{stream.size::>0[\"{stream.size::sbytes}\"||\"\"]}{stream.duration::>0[\" · {stream.duration::time}\"||\"\"]}{? · 👥 {stream.seeders}?}\n{?{stream.releaseGroup}?}{? · {stream.indexer}?}\n{?ℹ️ {stream.message}?}" },
    { id: 'minimal', label: 'Minimal', about: 'Two short lines, nothing else.',
      name: '{addon.name}{? · {stream.resolution}?}',
      desc: "{stream.size::>0[\"{stream.size::sbytes}\"||\"\"]}{? · {stream.languageEmojis::join(' ')}?}" },
    { id: 'small', label: 'Small caps', about: 'Quiet lettering with dot separators.',
      name: "{service.cached[\"⚡\"||\"⏳\"]} {addon.name::smallcaps}{? · {stream.resolution::replace('2160p','4K')}?}",
      desc: "{?{stream.title::title}?}{? · {stream.year}?}\n{?{stream.quality::smallcaps}?}{? · {stream.visualTags::join(' · ')}?}{? · {stream.audioTags::join(' · ')}?}\n{stream.size::>0[\"{stream.size::sbytes}\"||\"\"]}{? · {stream.releaseGroup::smallcaps}?}\n{?{stream.languageCodes::join(' · ')}?}" },
    { id: 'friendly', label: 'Readable names', about: '2160p becomes 4K, 1080p FHD. Warns on low quality.',
      name: "{stream.resolution::exists[\"{stream.resolution::replace('2160p','4K UHD')::replace('1440p','QHD')::replace('1080p','FHD')::replace('720p','HD')}\"||\"Unknown\"]}{service.cached[\" ⚡\"||\" ⏳\"]}",
      desc: "{?{stream.quality}?}{? · {stream.encode}?}{? · {stream.visualTags::join(' ')}?}\n{stream.size::>0[\"{stream.size::sbytes}\"||\"\"]}{? · {addon.name}?}{? · {stream.indexer}?}\n{stream.resolution::in('480p','360p','240p')[\"⚠️ Low quality\"||\"\"]}" }
  ];


  window.ChipData = { USER: USER, SAMPLES: SAMPLES, PRESETS: PRESETS };
})();
