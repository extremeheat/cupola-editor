'use strict'

import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
// import { format as formatUrl } from 'url'
// // import { prepare } from './AssetLoader'
// const fs = require('fs');

const ProgressBar = require('electron-progressbar');

const isDevelopment = process.env.NODE_ENV !== 'production'

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow

function createMainWindow() {
    const window = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            preload: path.join(__dirname, "./preload.js")
        }
    })

    if (isDevelopment) {
        window.webContents.openDevTools()
    }

    window.loadFile(path.join(__dirname, "../client/index.html"));

    window.on('closed', () => {
        mainWindow = null
    })

    window.webContents.on('devtools-opened', () => {
        window.focus()
        setImmediate(() => {
            window.focus()
        })
    })

    ipcMain.on('OpenViewer', () => {
        showProgressBar(window);
    })

    ipcMain.on('OpenMain', () => {
        window.loadFile(path.join(__dirname, "../client/index.html"));
    })

    // ipcMain.handle('prepare', (event, version) => {
    //     const result = prepare(version);
    //     return result;
    // })

    // ipcMain.on('save', (event, path, buffer) => {
    //     fs.writeFile(path, buffer, err => {
    //         console.log('e', err);
    //     })
    // })

    return window
}

// quit application when all windows are closed
app.on('window-all-closed', () => {
    // on macOS it is common for applications to stay open until the user explicitly quits
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // on macOS it is common to re-create a window even after all windows have been closed
    if (mainWindow === null) {
        mainWindow = createMainWindow()
    }
})

// create main BrowserWindow when electron is ready
app.on('ready', () => {
    mainWindow = createMainWindow()

})

function showProgressBar(mainWindow) {
    var progressBar = new ProgressBar({
        text: 'Preparing data...',
        detail: 'Simulated loading bar, nothing is loading!',
        browserWindow: {
            text: 'Preparing data...',
            detail: 'Wait...',
            parent: mainWindow,
            webPreferences: {
                nodeIntegration: true
            }
        },
        webPreferences: {
            nodeIntegration: true
        }
    });

    progressBar
        .on('completed', function () {
            console.info(`completed...`);
            progressBar.detail = 'Task completed. Exiting...';

            mainWindow.loadFile(path.join(__dirname, "../editor/editor.html"));
        })
        .on('aborted', function () {
            console.info(`aborted...`);
        });

    // launch a task...
    // launchTask();

    // when task is completed, set the progress bar to completed
    // ps: setTimeout is used here just to simulate an interval between the start and the end of a task
    setTimeout(function () {
        progressBar.setCompleted();
    }, 3000);
}