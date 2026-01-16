import { Given, When, Then } from '@cucumber/cucumber';
import request from 'supertest';
import app from '../../app.js';  // ton serveur Express

let response;

Given('I request the Excel download', async function () {
  response = await request(app).get('/download-excel');
});

When('the server processes the request', function () {
  // rien à faire, la requête est déjà exécutée
});

Then('I should get a valid Excel file', function () {
  if (!response.headers['content-type'].includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
    throw new Error('Le fichier Excel n\'a pas été généré !');
  }
});
