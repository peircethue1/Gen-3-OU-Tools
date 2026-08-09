/**
 * Fetches Smogon data to update the cache and syncs the Smogon data state with the cache
 */

import {
  nonEmptyObject,
  runtimeFetch,
  gen3OUToolsDb,
  readMetaDb,
  readSmogonDb,
  writeSmogonDb,
  writeMetaDb,
} from '@gen-3-ou-tools/utilities.js';
import { gen3OUToolsSlice } from './gen3OUToolsSlice.js';

const maxAge = 43200000;

// Parses the Smogon leads text
const parseSmogonLeads = (text) => {
  if (typeof text !== 'string') {
    return {
      totalLeads: 0,
      data: {}
    };
  }

  const lines = text.split('\n');
  let totalLeads = 0;
  const leads = {};

  // Creates structured leads data for each Pokemon from the text
  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("+") || line.includes("| Rank")) {
      continue;
    }

    if (line.startsWith("Total leads:")) {
      totalLeads = parseInt(line.split(":")[1], 10) || 0;

      continue;
    }

    const columns = line.split('|').map(column => column.trim());

    if (columns.length >= 6) {
      const [, rank, name, usage, rawCount] = columns;

      const parsedRank = parseInt(rank, 10);
      const parsedUsage = parseFloat(usage) / 100;
      const parsedRawCount = parseInt(rawCount, 10);

      if (name && !isNaN(parsedRank) && !isNaN(parsedUsage) && !isNaN(parsedRawCount)) {
        leads[name] = {
          rank: parsedRank,
          usage: parsedUsage,
          rawCount: parsedRawCount,
        };
      }
    }
  }

  return {
    totalLeads,
    data: leads
  };
};

// Checks if the Smogon data is valid
const isValidSmogonData = (data) => {
  if (!nonEmptyObject(data)) {
    return false;
  }

  return ["0", "1500", "1630", "1760"].every((rating) =>
    nonEmptyObject(data[rating]?.chaos) &&
    !!data[rating]?.leads?.totalLeads &&
    nonEmptyObject(data[rating]?.leads?.data)
  );
};

// Fetches the Smogon data from the server
const fetchSmogonData = async (cachedFolder, cachedModified) => {
  try {
    const base = 'https://www.smogon.com/stats/';
    const indexResponse = await runtimeFetch(base);

    if (!indexResponse?.ok) {
      throw new Error(`Failed to fetch index HTML with this status: ${indexResponse?.status ?? 'unknown'}`);
    }

    const indexHtml = indexResponse.text();

    if (typeof indexHtml !== 'string') {
      throw new Error("Index HTML is not valid");
    }

    const regex = /href="(\d{4}-\d{2})\/".*?(\d{2}-[a-zA-Z]{3}-\d{4}\s+\d{2}:\d{2})/gi;

    const matches = [...indexHtml.matchAll(regex)].map((match) => ({
      folder: match[1],
      modified: match[2],
    }));

    if (!matches.length) {
      const folders = [...indexHtml.matchAll(/href="(\d{4}-\d{2})\//g)]
        .map((match) => ({ folder: match[1], modified: null }));

      matches.push(...folders);
    }

    matches.sort((a, b) => a.folder.localeCompare(b.folder));

    const latestMatch = matches[matches.length - 1];
    const latestFolder = latestMatch?.folder;
    const latestModified = latestMatch?.modified;

    if (!latestFolder) {
      throw new Error("Could not find any Smogon directories");
    }

    if (latestFolder === cachedFolder && latestModified === cachedModified) {
      return { stale: false, folder: latestFolder, modified: latestModified };
    }

    const responses = await Promise.all([
      runtimeFetch(`${base}${latestFolder}/chaos/gen3ou-0.json`),
      runtimeFetch(`${base}${latestFolder}/chaos/gen3ou-1500.json`),
      runtimeFetch(`${base}${latestFolder}/chaos/gen3ou-1630.json`),
      runtimeFetch(`${base}${latestFolder}/chaos/gen3ou-1760.json`),
      runtimeFetch(`${base}${latestFolder}/leads/gen3ou-0.txt`),
      runtimeFetch(`${base}${latestFolder}/leads/gen3ou-1500.txt`),
      runtimeFetch(`${base}${latestFolder}/leads/gen3ou-1630.txt`),
      runtimeFetch(`${base}${latestFolder}/leads/gen3ou-1760.txt`),
    ]);

    const failedResponseIndex = responses.findIndex((response) => !response?.ok);

    if (failedResponseIndex >= 0) {
      throw new Error(`Failed to fetch a Smogon file with this status: ${responses[failedResponseIndex]?.status ?? 'unknown'}`);
    }

    const [
      chaos0Response,
      chaos1500Response,
      chaos1630Response,
      chaos1760Response,
      leads0Response,
      leads1500Response,
      leads1630Response,
      leads1760Response,
    ] = responses;

    const smogonData = {
      "0": {
        chaos: chaos0Response.json?.(),
        leads: parseSmogonLeads(leads0Response.text?.()),
      },
      "1500": {
        chaos: chaos1500Response.json?.(),
        leads: parseSmogonLeads(leads1500Response.text?.()),
      },
      "1630": {
        chaos: chaos1630Response.json?.(),
        leads: parseSmogonLeads(leads1630Response.text?.()),
      },
      "1760": {
        chaos: chaos1760Response.json?.(),
        leads: parseSmogonLeads(leads1760Response.text?.()),
      },
    };

    const allResponsesValid = isValidSmogonData(smogonData);

    if (!allResponsesValid) {
      throw new Error("A Smogon file is invalid");
    }

    return { stale: true, folder: latestFolder, modified: latestModified, smogonData };
  } catch (error) {
    console.debug('[Gen 3 OU Tools] Failed to fetch Smogon data with this error:', error);

    return null;
  }
};

// Syncs the Smogon data state with the cache
export const syncSmogonData = async (config) => {
  const { db: database, store } = { ...config };
  const db = database || gen3OUToolsDb.value;

  const {
    updated,
    smogonFolder: cachedFolder,
    smogonModified: cachedModified,
  } = await readMetaDb(['updated', 'smogonFolder', 'smogonModified'], { db });

  const { smogonData } = await readSmogonDb(['smogonData'], { db });

  const onlineStale = !isValidSmogonData(smogonData) ||
    !updated ||
    (Date.now() - updated) > maxAge ||
    (Date.now() - updated) < 0;

  let onlineSmogonData = smogonData;
  let metadata = null;
  let hasWrites = false;

  // Checks if the cache is stale or invalid and fetches Smogon data
  if (onlineStale) {
    const smogonUpdate = isValidSmogonData(smogonData)
      ? await fetchSmogonData(cachedFolder, cachedModified)
      : await fetchSmogonData();

    if (smogonUpdate) {
      if (smogonUpdate.stale === false) {
        metadata = { updated: Date.now() };
      } else if (isValidSmogonData(smogonUpdate.smogonData)) {
        onlineSmogonData = smogonUpdate.smogonData;

        metadata = {
          updated: Date.now(),
          smogonFolder: smogonUpdate.folder,
          smogonModified: smogonUpdate.modified,
        };

        hasWrites = true;
      }
    }
  }

  if (!isValidSmogonData(onlineSmogonData)) {
    console.error(
      '[Gen 3 OU Tools] Failed to sync Smogon data.',
      '\nsmogonData (cached):', smogonData,
      '\nsmogonData (latest):', onlineSmogonData,
    );

    return;
  }

  // Caches the updated Smogon data and metadata
  if (metadata) {
    if (hasWrites) {
      await writeSmogonDb({ smogonData: onlineSmogonData }, { db });

      console.debug(
        '[Gen 3 OU Tools] Successfully updated the Smogon data cache.',
        '\nsmogonData (cached):', smogonData,
        '\nsmogonData (latest):', onlineSmogonData,
      );
    }

    await writeMetaDb(metadata, { db });
  }

  if (typeof store?.dispatch !== 'function') {
    return;
  }

  store.dispatch(gen3OUToolsSlice.actions.setSmogonData(onlineSmogonData));
};