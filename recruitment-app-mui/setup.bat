@echo off
echo Creating Bench Sales Module in existing structure...

:: Create modules directory structure
mkdir src\modules 2>nul
mkdir src\modules\benchSales 2>nul
mkdir src\modules\benchSales\components 2>nul
mkdir src\modules\benchSales\components\Dashboard 2>nul
mkdir src\modules\benchSales\components\CandidateIntake 2>nul
mkdir src\modules\benchSales\components\CaseManagement 2>nul
mkdir src\modules\benchSales\components\Verification 2>nul
mkdir src\modules\benchSales\hooks 2>nul
mkdir src\modules\benchSales\services 2>nul
mkdir src\modules\benchSales\utils 2>nul
mkdir src\modules\benchSales\styles 2>nul

:: Dashboard components
echo // BenchSalesDashboard component > src\modules\benchSales\components\Dashboard\BenchSalesDashboard.jsx
echo // DashboardMetrics component > src\modules\benchSales\components\Dashboard\DashboardMetrics.jsx
echo // ActiveCases component > src\modules\benchSales\components\Dashboard\ActiveCases.jsx
echo // QuickActions component > src\modules\benchSales\components\Dashboard\QuickActions.jsx

:: CandidateIntake components
echo // IntakeForm component > src\modules\benchSales\components\CandidateIntake\IntakeForm.jsx
echo // ResumeUpload component > src\modules\benchSales\components\CandidateIntake\ResumeUpload.jsx
echo // DuplicateChecker component > src\modules\benchSales\components\CandidateIntake\DuplicateChecker.jsx
echo // FieldValidation component > src\modules\benchSales\components\CandidateIntake\FieldValidation.jsx

:: CaseManagement components
echo // CaseList component > src\modules\benchSales\components\CaseManagement\CaseList.jsx
echo // CaseDetails component > src\modules\benchSales\components\CaseManagement\CaseDetails.jsx
echo // CaseTimeline component > src\modules\benchSales\components\CaseManagement\CaseTimeline.jsx
echo // CaseNotes component > src\modules\benchSales\components\CaseManagement\CaseNotes.jsx
echo // StatusUpdater component > src\modules\benchSales\components\CaseManagement\StatusUpdater.jsx

:: Verification components
echo // VerificationPipeline component > src\modules\benchSales\components\Verification\VerificationPipeline.jsx
echo // VerificationChecklist component > src\modules\benchSales\components\Verification\VerificationChecklist.jsx
echo // LinkedInVerify component > src\modules\benchSales\components\Verification\LinkedInVerify.jsx
echo // DocumentVerify component > src\modules\benchSales\components\Verification\DocumentVerify.jsx

:: Hooks
echo // useCaseManagement hook > src\modules\benchSales\hooks\useCaseManagement.js
echo // useVerification hook > src\modules\benchSales\hooks\useVerification.js
echo // useIntakeForm hook > src\modules\benchSales\hooks\useIntakeForm.js

:: Services
echo // caseService > src\modules\benchSales\services\caseService.js
echo // verificationService > src\modules\benchSales\services\verificationService.js
echo // intakeService > src\modules\benchSales\services\intakeService.js

:: Utils
echo // caseHelpers > src\modules\benchSales\utils\caseHelpers.js
echo // slaCalculator > src\modules\benchSales\utils\slaCalculator.js
echo // validators > src\modules\benchSales\utils\validators.js

:: Styles
echo /* Dashboard styles */ > src\modules\benchSales\styles\Dashboard.css
echo /* CaseManagement styles */ > src\modules\benchSales\styles\CaseManagement.css
echo /* Intake styles */ > src\modules\benchSales\styles\Intake.css

:: Create index file for module exports
echo // Module exports > src\modules\benchSales\index.js

echo.
echo Bench Sales module structure created successfully!
echo Module location: src/modules/benchSales/
echo.
pause