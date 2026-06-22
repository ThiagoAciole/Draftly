!macro MARKPAD_REGISTER_OPEN_WITH EXTENSION
  WriteRegStr SHCTX "Software\Classes\.${EXTENSION}\shell\Open with Draftly" "" "Open with Draftly"
  WriteRegStr SHCTX "Software\Classes\.${EXTENSION}\shell\Open with Draftly" "Icon" "$INSTDIR\Draftly.exe"
  WriteRegStr SHCTX "Software\Classes\.${EXTENSION}\shell\Open with Draftly\command" "" "$\"$INSTDIR\Draftly.exe$\" $\"%1$\""

  WriteRegStr SHCTX "Software\Classes\SystemFileAssociations\.${EXTENSION}\shell\Open with Draftly" "" "Open with Draftly"
  WriteRegStr SHCTX "Software\Classes\SystemFileAssociations\.${EXTENSION}\shell\Open with Draftly" "Icon" "$INSTDIR\Draftly.exe"
  WriteRegStr SHCTX "Software\Classes\SystemFileAssociations\.${EXTENSION}\shell\Open with Draftly\command" "" "$\"$INSTDIR\Draftly.exe$\" $\"%1$\""

  WriteRegStr SHCTX "Software\Classes\.${EXTENSION}\OpenWithList\Draftly.exe" "" ""
!macroend

!macro MARKPAD_UNREGISTER_OPEN_WITH EXTENSION
  DeleteRegKey SHCTX "Software\Classes\.${EXTENSION}\shell\Open with Draftly"
  DeleteRegKey SHCTX "Software\Classes\SystemFileAssociations\.${EXTENSION}\shell\Open with Draftly"
  DeleteRegKey SHCTX "Software\Classes\.${EXTENSION}\OpenWithList\Draftly.exe"
!macroend

!macro MARKPAD_REGISTER_FILE_TYPE EXTENSION PROGID DESCRIPTION ICON
  WriteRegStr SHCTX "Software\Classes\.${EXTENSION}" "" "${PROGID}"
  WriteRegStr SHCTX "Software\Classes\${PROGID}" "" "${DESCRIPTION}"
  WriteRegStr SHCTX "Software\Classes\${PROGID}\DefaultIcon" "" "$INSTDIR\file-icons\${ICON}.ico,0"
  WriteRegStr SHCTX "Software\Classes\${PROGID}\shell\open\command" "" "$\"$INSTDIR\Draftly.exe$\" $\"%1$\""
!macroend

!macro MARKPAD_UNREGISTER_FILE_TYPE EXTENSION PROGID
  ReadRegStr $0 SHCTX "Software\Classes\.${EXTENSION}" ""
  StrCmp $0 "${PROGID}" 0 +2
    DeleteRegValue SHCTX "Software\Classes\.${EXTENSION}" ""
  DeleteRegKey SHCTX "Software\Classes\${PROGID}"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  CreateShortcut "$DESKTOP\Draftly.lnk" "$INSTDIR\Draftly.exe" "" "$INSTDIR\Draftly.exe" 0

  WriteRegStr SHCTX "Software\Classes\Applications\Draftly.exe\shell\open\command" "" "$\"$INSTDIR\Draftly.exe$\" $\"%1$\""
  !insertmacro MARKPAD_REGISTER_OPEN_WITH "md"
  !insertmacro MARKPAD_REGISTER_OPEN_WITH "markdown"
  !insertmacro MARKPAD_REGISTER_OPEN_WITH "mdown"
  !insertmacro MARKPAD_REGISTER_OPEN_WITH "mkd"
  !insertmacro MARKPAD_REGISTER_OPEN_WITH "txt"
  !insertmacro MARKPAD_REGISTER_OPEN_WITH "js"
  !insertmacro MARKPAD_REGISTER_OPEN_WITH "jsx"
  !insertmacro MARKPAD_REGISTER_OPEN_WITH "html"
  !insertmacro MARKPAD_REGISTER_OPEN_WITH "htm"
  !insertmacro MARKPAD_REGISTER_OPEN_WITH "json"

  !insertmacro MARKPAD_REGISTER_FILE_TYPE "md" "Draftly.Markdown" "Markdown File" "markdown"
  !insertmacro MARKPAD_REGISTER_FILE_TYPE "markdown" "Draftly.Markdown" "Markdown File" "markdown"
  !insertmacro MARKPAD_REGISTER_FILE_TYPE "mdown" "Draftly.Markdown" "Markdown File" "markdown"
  !insertmacro MARKPAD_REGISTER_FILE_TYPE "mkd" "Draftly.Markdown" "Markdown File" "markdown"
  !insertmacro MARKPAD_REGISTER_FILE_TYPE "txt" "Draftly.Text" "Text File" "txt"
  !insertmacro MARKPAD_REGISTER_FILE_TYPE "js" "Draftly.JavaScript" "JavaScript File" "js"
  !insertmacro MARKPAD_REGISTER_FILE_TYPE "jsx" "Draftly.JavaScript" "JavaScript File" "js"
  !insertmacro MARKPAD_REGISTER_FILE_TYPE "html" "Draftly.HTML" "HTML File" "html"
  !insertmacro MARKPAD_REGISTER_FILE_TYPE "htm" "Draftly.HTML" "HTML File" "html"
  !insertmacro MARKPAD_REGISTER_FILE_TYPE "json" "Draftly.JSON" "JSON File" "json"

  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  Delete "$DESKTOP\Draftly.lnk"

  DeleteRegKey SHCTX "Software\Classes\Applications\Draftly.exe"
  !insertmacro MARKPAD_UNREGISTER_OPEN_WITH "md"
  !insertmacro MARKPAD_UNREGISTER_OPEN_WITH "markdown"
  !insertmacro MARKPAD_UNREGISTER_OPEN_WITH "mdown"
  !insertmacro MARKPAD_UNREGISTER_OPEN_WITH "mkd"
  !insertmacro MARKPAD_UNREGISTER_OPEN_WITH "txt"
  !insertmacro MARKPAD_UNREGISTER_OPEN_WITH "js"
  !insertmacro MARKPAD_UNREGISTER_OPEN_WITH "jsx"
  !insertmacro MARKPAD_UNREGISTER_OPEN_WITH "html"
  !insertmacro MARKPAD_UNREGISTER_OPEN_WITH "htm"
  !insertmacro MARKPAD_UNREGISTER_OPEN_WITH "json"

  !insertmacro MARKPAD_UNREGISTER_FILE_TYPE "md" "Draftly.Markdown"
  !insertmacro MARKPAD_UNREGISTER_FILE_TYPE "markdown" "Draftly.Markdown"
  !insertmacro MARKPAD_UNREGISTER_FILE_TYPE "mdown" "Draftly.Markdown"
  !insertmacro MARKPAD_UNREGISTER_FILE_TYPE "mkd" "Draftly.Markdown"
  !insertmacro MARKPAD_UNREGISTER_FILE_TYPE "txt" "Draftly.Text"
  !insertmacro MARKPAD_UNREGISTER_FILE_TYPE "js" "Draftly.JavaScript"
  !insertmacro MARKPAD_UNREGISTER_FILE_TYPE "jsx" "Draftly.JavaScript"
  !insertmacro MARKPAD_UNREGISTER_FILE_TYPE "html" "Draftly.HTML"
  !insertmacro MARKPAD_UNREGISTER_FILE_TYPE "htm" "Draftly.HTML"
  !insertmacro MARKPAD_UNREGISTER_FILE_TYPE "json" "Draftly.JSON"

  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend
