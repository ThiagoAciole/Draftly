import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";

const RELEASES_API_URL = "https://api.github.com/repos/ThiagoAciole/Draftly/releases/latest";

type GitHubRelease = {
  tag_name: string;
  html_url: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
};

export type AppUpdate =
  | { status: "current"; currentVersion: string }
  | { status: "available"; currentVersion: string; version: string; downloadUrl: string }
  | { status: "unpublished" };

function compareVersions(first: string, second: string) {
  const toParts = (version: string) =>
    version.replace(/^v/, "").split(/[+-]/)[0].split(".").map((part) => Number(part) || 0);
  const [firstParts, secondParts] = [toParts(first), toParts(second)];

  for (let index = 0; index < Math.max(firstParts.length, secondParts.length); index += 1) {
    const difference = (firstParts[index] ?? 0) - (secondParts[index] ?? 0);
    if (difference !== 0) return difference;
  }

  return 0;
}

function getDownloadUrl(release: GitHubRelease) {
  const isWindows = navigator.userAgent.includes("Windows");
  const isLinux = navigator.userAgent.includes("Linux");
  const asset = release.assets.find(({ name }) =>
    isWindows ? name.endsWith("-setup.exe") : isLinux ? name.endsWith(".deb") : false,
  );

  return asset?.browser_download_url ?? release.html_url;
}

export async function checkForAppUpdate(): Promise<AppUpdate> {
  const response = await fetch(RELEASES_API_URL, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (response.status === 404) return { status: "unpublished" };
  if (!response.ok) throw new Error("Não foi possível consultar as releases do Draftly.");

  const release = (await response.json()) as GitHubRelease;
  const currentVersion = await getVersion();
  if (compareVersions(release.tag_name, currentVersion) <= 0) {
    return { status: "current", currentVersion };
  }

  return {
    status: "available",
    currentVersion,
    version: release.tag_name.replace(/^v/, ""),
    downloadUrl: getDownloadUrl(release),
  };
}

export async function downloadAppUpdate(downloadUrl: string) {
  await openUrl(downloadUrl);
}
