'use strict';
const vscode = require('vscode');
const { ImagePanelProvider } = require('./views/imagePanelProvider');
const { registerReviewImageNeedCommand } = require('./lib/reviewImageNeedCommand');

function activate(context) {
  const imagePanel = new ImagePanelProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ImagePanelProvider.viewId, imagePanel)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('oatImages.refreshPanel', () => imagePanel.refresh())
  );

  registerReviewImageNeedCommand(context, vscode);
}

function deactivate() {}

module.exports = { activate, deactivate };
