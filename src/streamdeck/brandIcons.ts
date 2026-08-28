// Curated set of brand/logo icons for the StreamDeck icon picker, backed by
// `simple-icons`. We do NOT bulk-import the full ~3450-icon catalog (bundle
// bloat + irrelevant search noise) — only a hand-picked list of brands that
// make sense as launch targets for a PC-control StreamDeck app.
//
// NOTE (verified against the installed simple-icons@16.28.0 package): this
// version does not ship icons for Microsoft, Windows, Microsoft Edge, Slack,
// Adobe (Photoshop/Premiere), Skype, or Xbox — those .svg files are simply
// absent from node_modules/simple-icons/icons and node_modules/simple-icons/
// data/simple-icons.json (likely removed upstream for trademark reasons).
// The list below substitutes reasonable equivalents where possible (e.g.
// Google Chrome instead of a generic "Chrome", Photopea/DaVinci Resolve
// instead of Adobe apps, GNOME-style terminals instead of Windows Terminal).
import {
  siGooglechrome,
  siFirefox,
  siBrave,
  siOpera,
  siSafari,
  siApple,
  siLinux,
  siAndroid,
  siGithub,
  siDocker,
  siNodedotjs,
  siGit,
  siPostman,
  siNeovim,
  siVim,
  siWarp,
  siAlacritty,
  siTmux,
  siJetbrains,
  siSublimetext,
  siGitkraken,
  siObsstudio,
  siSpotify,
  siYoutube,
  siTwitch,
  siNetflix,
  siFigma,
  siPhotopea,
  siDavinciresolve,
  siDiscord,
  siWhatsapp,
  siTelegram,
  siZoom,
  siSignal,
  siTeamviewer,
  siAnydesk,
  siNotion,
  siGmail,
  siGoogledrive,
  siProtonvpn,
  siSteam,
  siEpicgames,
  siGogdotcom,
  siItchdotio,
  siBattledotnet,
  siPlaystation,
  siRiotgames,
  si1password,
  siVlcmediaplayer,
  siBlender,
  siGimp,
  siAudacity,
} from 'simple-icons';

export type BrandIconDef = {
  slug: string;
  title: string;
  path: string;
  hex: string;
};

export const BRAND_ICONS: BrandIconDef[] = [
  // Browsers
  { slug: 'googlechrome', title: 'Google Chrome', path: siGooglechrome.path, hex: siGooglechrome.hex },
  { slug: 'firefox', title: 'Firefox', path: siFirefox.path, hex: siFirefox.hex },
  { slug: 'brave', title: 'Brave', path: siBrave.path, hex: siBrave.hex },
  { slug: 'opera', title: 'Opera', path: siOpera.path, hex: siOpera.hex },
  { slug: 'safari', title: 'Safari', path: siSafari.path, hex: siSafari.hex },

  // OS / platforms
  { slug: 'apple', title: 'Apple', path: siApple.path, hex: siApple.hex },
  { slug: 'linux', title: 'Linux', path: siLinux.path, hex: siLinux.hex },
  { slug: 'android', title: 'Android', path: siAndroid.path, hex: siAndroid.hex },

  // Dev tools
  { slug: 'github', title: 'GitHub', path: siGithub.path, hex: siGithub.hex },
  { slug: 'docker', title: 'Docker', path: siDocker.path, hex: siDocker.hex },
  { slug: 'nodedotjs', title: 'Node.js', path: siNodedotjs.path, hex: siNodedotjs.hex },
  { slug: 'git', title: 'Git', path: siGit.path, hex: siGit.hex },
  { slug: 'postman', title: 'Postman', path: siPostman.path, hex: siPostman.hex },
  { slug: 'neovim', title: 'Neovim', path: siNeovim.path, hex: siNeovim.hex },
  { slug: 'vim', title: 'Vim', path: siVim.path, hex: siVim.hex },
  { slug: 'warp', title: 'Warp', path: siWarp.path, hex: siWarp.hex },
  { slug: 'alacritty', title: 'Alacritty', path: siAlacritty.path, hex: siAlacritty.hex },
  { slug: 'tmux', title: 'tmux', path: siTmux.path, hex: siTmux.hex },
  { slug: 'jetbrains', title: 'JetBrains', path: siJetbrains.path, hex: siJetbrains.hex },
  { slug: 'sublimetext', title: 'Sublime Text', path: siSublimetext.path, hex: siSublimetext.hex },
  { slug: 'gitkraken', title: 'GitKraken', path: siGitkraken.path, hex: siGitkraken.hex },

  // Streaming / creative
  { slug: 'obsstudio', title: 'OBS Studio', path: siObsstudio.path, hex: siObsstudio.hex },
  { slug: 'spotify', title: 'Spotify', path: siSpotify.path, hex: siSpotify.hex },
  { slug: 'youtube', title: 'YouTube', path: siYoutube.path, hex: siYoutube.hex },
  { slug: 'twitch', title: 'Twitch', path: siTwitch.path, hex: siTwitch.hex },
  { slug: 'netflix', title: 'Netflix', path: siNetflix.path, hex: siNetflix.hex },
  { slug: 'figma', title: 'Figma', path: siFigma.path, hex: siFigma.hex },
  { slug: 'photopea', title: 'Photopea', path: siPhotopea.path, hex: siPhotopea.hex },
  { slug: 'davinciresolve', title: 'DaVinci Resolve', path: siDavinciresolve.path, hex: siDavinciresolve.hex },

  // Communication
  { slug: 'discord', title: 'Discord', path: siDiscord.path, hex: siDiscord.hex },
  { slug: 'whatsapp', title: 'WhatsApp', path: siWhatsapp.path, hex: siWhatsapp.hex },
  { slug: 'telegram', title: 'Telegram', path: siTelegram.path, hex: siTelegram.hex },
  { slug: 'zoom', title: 'Zoom', path: siZoom.path, hex: siZoom.hex },
  { slug: 'signal', title: 'Signal', path: siSignal.path, hex: siSignal.hex },
  { slug: 'teamviewer', title: 'TeamViewer', path: siTeamviewer.path, hex: siTeamviewer.hex },
  { slug: 'anydesk', title: 'AnyDesk', path: siAnydesk.path, hex: siAnydesk.hex },

  // Productivity / utility
  { slug: 'notion', title: 'Notion', path: siNotion.path, hex: siNotion.hex },
  { slug: 'gmail', title: 'Gmail', path: siGmail.path, hex: siGmail.hex },
  { slug: 'googledrive', title: 'Google Drive', path: siGoogledrive.path, hex: siGoogledrive.hex },
  { slug: 'protonvpn', title: 'Proton VPN', path: siProtonvpn.path, hex: siProtonvpn.hex },
  { slug: '1password', title: '1Password', path: si1password.path, hex: si1password.hex },
  { slug: 'vlcmediaplayer', title: 'VLC media player', path: siVlcmediaplayer.path, hex: siVlcmediaplayer.hex },
  { slug: 'blender', title: 'Blender', path: siBlender.path, hex: siBlender.hex },
  { slug: 'gimp', title: 'GIMP', path: siGimp.path, hex: siGimp.hex },
  { slug: 'audacity', title: 'Audacity', path: siAudacity.path, hex: siAudacity.hex },

  // Gaming
  { slug: 'steam', title: 'Steam', path: siSteam.path, hex: siSteam.hex },
  { slug: 'epicgames', title: 'Epic Games', path: siEpicgames.path, hex: siEpicgames.hex },
  { slug: 'gogdotcom', title: 'GOG.com', path: siGogdotcom.path, hex: siGogdotcom.hex },
  { slug: 'itchdotio', title: 'Itch.io', path: siItchdotio.path, hex: siItchdotio.hex },
  { slug: 'battledotnet', title: 'Battle.net', path: siBattledotnet.path, hex: siBattledotnet.hex },
  { slug: 'playstation', title: 'PlayStation', path: siPlaystation.path, hex: siPlaystation.hex },
  { slug: 'riotgames', title: 'Riot Games', path: siRiotgames.path, hex: siRiotgames.hex },
];
