/* SYNC FIX */
import { AppData } from '../types';
/* SYNC FIX */
import { INITIAL_MEMORY, INITIAL_FOCUS } from '../constants';

// Fallback ID to ensure GIS never fails due to missing env var
const ENV_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const FALLBACK_CLIENT_ID = '765827205160-ft7dv2ud5ruf2tgft4jvt68dm7eboei6.apps.googleusercontent.com';
const CLIENT_ID = ENV_CLIENT_ID && ENV_CLIENT_ID.length > 5 ? ENV_CLIENT_ID : FALLBACK_CLIENT_ID;

const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'Ouroboros';
let ROOT_FOLDER_ID = '1XjE0j1L0KGL8HghbxHHpzHlB8CL1uzND';

export const setRootFolderId = (id: string) => {
    ROOT_FOLDER_ID = id;
};
const FILE_NAME = 'app-data.json';
const BACKUP_FILE_NAME = 'app-data.backup.json';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

/**
 * Loads the Google API scripts dynamically.
 */
export const loadGoogleScripts = (callback: () => void) => {
  const script1 = document.createElement('script');
  script1.src = 'https://apis.google.com/js/api.js';
  script1.async = true;
  script1.defer = true;
  script1.onerror = () => console.error("Failed to load gapi script");
  script1.onload = () => {
    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          discoveryDocs: DISCOVERY_DOCS,
        });
        gapiInited = true;
        if (gisInited) callback();
      } catch (err) {
        console.error("GAPI Init Error:", err);
      }
    });
  };
  document.body.appendChild(script1);

  const script2 = document.createElement('script');
  script2.src = 'https://accounts.google.com/gsi/client';
  script2.async = true;
  script2.defer = true;
  script2.onerror = () => console.error("Failed to load GIS script");
  script2.onload = () => {
    try {
      if (!CLIENT_ID) throw new Error("CLIENT_ID is undefined");
      
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: () => {}, 
      });
      gisInited = true;
      if (gapiInited) callback();
    } catch (err) {
      console.error("GIS Init Error:", err);
    }
  };
  document.body.appendChild(script2);
};

/**
 * Authenticates the user using Google Identity Services.
 */
export const authenticate = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject('Google Scripts not loaded');
    
    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        reject(resp);
      }
      resolve();
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

/**
 * Ensures the 'Ouroboros' folder exists.
 * Returns the Folder ID.
 */
export const ensureFolderExists = async (): Promise<string> => {
  try {
    // 1. Try to get folder via hardcoded ID directly
    try {
      const directResponse = await window.gapi.client.drive.files.get({
        fileId: ROOT_FOLDER_ID,
        fields: 'id, trashed'
      });
      if (directResponse.result && !directResponse.result.trashed) {
        console.log("Cortex anchored via ROOT_FOLDER_ID");
        return ROOT_FOLDER_ID;
      }
    } catch (directErr) {
      console.warn("Direct ID fetch failed, falling back to search...");
    }

    // 2. Search for existing folder
    const response = await window.gapi.client.drive.files.list({
      q: `mimeType = 'application/vnd.google-apps.folder' and name = '${FOLDER_NAME}' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    
    const files = response.result.files;
    if (files && files.length > 0) {
      return files[0].id;
    }

    // 3. Create if not found
    const createResponse = await window.gapi.client.drive.files.create({
      resource: {
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });
    
    return createResponse.result.id;

  } catch (err) {
    console.error("Error ensuring folder exists:", err);
    throw new Error("Failed to initialize Ouroboros folder structure.");
  }
};

/**
 * Helper to find a file ID by name inside a specific folder.
 * Returns null if not found.
 */
const findFileId = async (fileName: string, folderId: string): Promise<string | null> => {
  try {
    const response = await window.gapi.client.drive.files.list({
      q: `name = '${fileName}' and '${folderId}' in parents and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    const files = response.result.files;
    if (files && files.length > 0) {
      return files[0].id;
    }
    return null;
  } catch (err) {
    console.error(`Error finding file ${fileName}:`, err);
    throw err;
  }
};

/**
 * Reads content from a specific Drive file ID.
 * Strictly returns the raw text content of the file.
 * Throws an error if the request fails.
 */
export const readFile = async (fileId: string): Promise<string> => {
    try {
        const accessToken = window.gapi.client.getToken().access_token;
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Read File Failed: ${response.status} ${response.statusText}`);
        }

        return await response.text();
    } catch (error: any) {
        console.error(`Error reading file ${fileId}:`, error);
        throw error;
    }
};

/**
 * Creates a new file in the specified folder.
 * Returns the new File ID.
 */
export const createFile = async (name: string, content: string | object, folderId: string, mimeType: string): Promise<string> => {
    try {
        const metadata = {
            name: name,
            mimeType: mimeType,
            parents: [folderId]
        };

        const accessToken = window.gapi.client.getToken().access_token;
        const bodyContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
        
        const multipartRequestBody =
            `--foo_bar_baz\r\n` +
            `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
            `${JSON.stringify(metadata)}\r\n` +
            `--foo_bar_baz\r\n` +
            `Content-Type: ${mimeType}\r\n\r\n` +
            `${bodyContent}\r\n` +
            `--foo_bar_baz--`;

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'multipart/related; boundary=foo_bar_baz',
            },
            body: multipartRequestBody,
        });

        if (!response.ok) {
            throw new Error(`Create File Failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        return result.id;

    } catch (error) {
        console.error("Error creating file:", error);
        throw error;
    }
};

/**
 * Creates a backup of the current state file before overwriting.
 * Implements the "Snapshot Strategy".
 */
const createBackup = async (folderId: string, currentFileId: string): Promise<void> => {
    try {
        // 1. Read current content (Now returns string)
        const currentContent = await readFile(currentFileId);
        
        // 2. Check if backup file exists
        const backupFileId = await findFileId(BACKUP_FILE_NAME, folderId);
        
        const accessToken = window.gapi.client.getToken().access_token;
        let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        let method = 'POST';
        
        // Prepare metadata
        let metadata: any = {
            name: BACKUP_FILE_NAME,
            mimeType: 'application/json'
        };

        if (backupFileId) {
            url = `https://www.googleapis.com/upload/drive/v3/files/${backupFileId}?uploadType=multipart`;
            method = 'PATCH';
        } else {
            metadata.parents = [folderId];
        }

        const multipartRequestBody =
            `--foo_bar_baz\r\n` +
            `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
            `${JSON.stringify(metadata)}\r\n` +
            `--foo_bar_baz\r\n` +
            `Content-Type: application/json\r\n\r\n` +
            `${currentContent}\r\n` + // Inject raw string directly
            `--foo_bar_baz--`;

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'multipart/related; boundary=foo_bar_baz',
            },
            body: multipartRequestBody,
        });

        if (!response.ok) console.warn("Backup creation failed, but proceeding with save.");

    } catch (err) {
        console.error("Backup Error:", err);
        // We do not throw here to avoid blocking the main save if backup fails, 
        // but in a strict system we might want to.
    }
};

/**
 * Saves the full AppData to Google Drive.
 * Implements "Snapshot Strategy": Backs up existing data before writing new data.
 */
export const saveState = async (data: AppData): Promise<void> => {
  // Ensure the folder exists first
  const folderId = await ensureFolderExists();
  const fileId = await findFileId(FILE_NAME, folderId);
  const focusFileId = await findFileId('CURRENT_FOCUS.md', folderId);
  
  // SNAPSHOT STRATEGY: If file exists, backup first
  if (fileId) {
      await createBackup(folderId, fileId);
  }

  // Base metadata
  let metadata: any = {
    name: FILE_NAME,
    mimeType: 'application/json',
  };

  const accessToken = window.gapi.client.getToken().access_token;
  let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  let method = 'POST';

  if (fileId) {
    // Update existing file
    url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
    method = 'PATCH';
  } else {
    // Create new file
    metadata.parents = [folderId];
  }

  const multipartRequestBody =
    `--foo_bar_baz\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--foo_bar_baz\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${JSON.stringify(data, null, 2)}\r\n` +
    `--foo_bar_baz--`;

  const response = await fetch(url, {
    method: method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'multipart/related; boundary=foo_bar_baz',
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    throw new Error(`Drive Upload Failed: ${response.statusText}`);
  }

  // Save CURRENT_FOCUS.md
  let focusMethod = 'POST';
  let focusUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  let focusMetadata: any = {
      name: 'CURRENT_FOCUS.md',
      mimeType: 'text/markdown'
  };

  if (focusFileId) {
      focusMethod = 'PATCH';
      focusUrl = `https://www.googleapis.com/upload/drive/v3/files/${focusFileId}?uploadType=multipart`;
  } else {
      focusMetadata.parents = [folderId];
  }

  const focusMarkdown = `# Current Objective\n${data.focus.current_objective}\n\n## Chain of Thought\n${data.focus.chain_of_thought.map(t=>`- ${t}`).join('\n')}\n\n## Pending Tasks\n${data.focus.pending_tasks.map(t=>`- [ ] ${t}`).join('\n')}\n\n*Last Updated: ${data.focus.last_updated}*`;

  const focusMultipartBody =
    `--foo_bar_baz\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(focusMetadata)}\r\n` +
    `--foo_bar_baz\r\n` +
    `Content-Type: text/markdown\r\n\r\n` +
    `${focusMarkdown}\r\n` +
    `--foo_bar_baz--`;

  const focusResponse = await fetch(focusUrl, {
    method: focusMethod,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'multipart/related; boundary=foo_bar_baz',
    },
    body: focusMultipartBody,
  });

  if (!focusResponse.ok) {
      console.warn("Failed to save CURRENT_FOCUS.md");
  }
};

/**
 * Loads the AppData from Google Drive.
 * Returns null if file does not exist.
 */
export const loadState = async (): Promise<AppData | null> => {
  const folderId = await ensureFolderExists();
  const fileId = await findFileId(FILE_NAME, folderId);
  
  if (!fileId) return null;

  try {
      const content = await readFile(fileId);
      return JSON.parse(content);
  } catch (err) {
      console.error("Failed to parse AppData JSON:", err);
      throw new Error("AppData file is corrupted or not JSON.");
  }
};

/**
 * Diagnostic tool to inspect the Drive state.
 */
export const runDiagnostics = async (): Promise<string> => {
  const log = [];
  try {
    log.push("--- DIAGNOSTIC REPORT ---");
    log.push(`1. Checking for Ouroboros Cortex via Hardcoded ID (${ROOT_FOLDER_ID})...`);
    
    let folderId = "";
    try {
        const directResp = await window.gapi.client.drive.files.get({
            fileId: ROOT_FOLDER_ID,
            fields: 'id, name, trashed'
        });
        if (directResp.result && !directResp.result.trashed) {
            folderId = directResp.result.id;
            log.push(`   FOUND: Cortex Anchored. ID: ${folderId}`);
        } else {
             log.push(`   TRASHED: Cortex folder is trashed.`);
        }
    } catch (err) {
        log.push(`   NOT FOUND via Hardcoded ID. Falling back to name search...`);
        const folderResp = await window.gapi.client.drive.files.list({
          q: `mimeType = 'application/vnd.google-apps.folder' and name = '${FOLDER_NAME}' and trashed = false`,
          fields: "files(id, name, parents)",
          spaces: 'drive'
        });
        const folders = folderResp.result.files;
        if (folders && folders.length > 0) {
          folderId = folders[0].id;
          log.push(`   FOUND via Search: ${folders.length} folder(s). ID: ${folderId}`);
        } else {
          log.push("   NOT FOUND: No 'Ouroboros' folder found.");
        }
    }

    if (folderId) {
        log.push(`2. Checking for '${FILE_NAME}' in folder...`);
        const appFileId = await findFileId(FILE_NAME, folderId);
        log.push(appFileId ? `   FOUND: ID: ${appFileId}` : "   NOT FOUND.");

        log.push(`3. Checking for '${BACKUP_FILE_NAME}' in folder...`);
        const backupFileId = await findFileId(BACKUP_FILE_NAME, folderId);
        log.push(backupFileId ? `   FOUND: ID: ${backupFileId}` : "   NOT FOUND.");
    }
    
    log.push("--- END REPORT ---");
    return log.join("\n");

  } catch (err: any) {
    return `Diagnostic Error: ${err.message}`;
  }
};

/**
 * Creates the app-data.json file explicitly inside the Ouroboros folder.
 */
export const performSurgicalInjection = async (): Promise<string> => {
  try {
    const folderId = await ensureFolderExists();
    const existingId = await findFileId(FILE_NAME, folderId);
    if (existingId) {
      return `File already exists in correct folder (ID: ${existingId}). No action taken.`;
    }

    const payload: AppData = {
      app_version: "1.0.0",
      last_sync_timestamp: Date.now(),
      memory: INITIAL_MEMORY,
      focus: INITIAL_FOCUS
    };

    const id = await createFile(FILE_NAME, payload, folderId, 'application/json');
    return `Minne återställt. Systemet är nu online och redo för GitHub-integration. (File ID: ${id})`;

  } catch (err: any) {
    return `Critical Failure: ${err.message}`;
  }
};

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}