'use strict';
const vscode = require('vscode');
const { ImagePanelProvider } = require('./views/imagePanelProvider');
const { registerLocalFileIntakeCommand } = require('./lib/localFileIntakeCommand');
const { registerReviewImageNeedCommand } = require('./lib/reviewImageNeedCommand');
const { registerUrlIntakeCommand } = require('./lib/urlIntakeCommand');

function activate(context) {
  const imagePanel = new ImagePanelProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ImagePanelProvider.viewId, imagePanel)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('oatImages.refreshPanel', () => imagePanel.refresh())
  );

  registerLocalFileIntakeCommand(context, vscode);
  registerReviewImageNeedCommand(context, vscode);
  registerUrlIntakeCommand(context, vscode);
}

function deactivate() {}

module.exports = { activate, deactivate };
