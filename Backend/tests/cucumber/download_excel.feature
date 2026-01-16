Feature: Download Excel

  Scenario: User downloads an Excel file
    Given I request the Excel download
    When the server processes the request
    Then I should get a valid Excel file
