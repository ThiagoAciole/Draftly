!macro NSIS_HOOK_POSTINSTALL
  ReadRegStr $0 SHCTX "Software\Classes\.md" ""
  ${If} $0 != "Draftly.Markdown"
    WriteRegStr SHCTX "Software\Classes\.md" "Draftly.Markdown_backup" "$0"
  ${EndIf}

  WriteRegStr SHCTX "Software\Classes\.md\OpenWithProgids" "Draftly.Markdown" ""
  WriteRegStr SHCTX "Software\Classes\Draftly.Markdown" "" "Arquivo Markdown"
  WriteRegStr SHCTX "Software\Classes\Draftly.Markdown\DefaultIcon" "" "$INSTDIR\resources\file-markdown.ico,0"
  WriteRegStr SHCTX "Software\Classes\Draftly.Markdown\shell" "" "open"
  WriteRegStr SHCTX "Software\Classes\Draftly.Markdown\shell\open" "" "Abrir com Draftly"
  WriteRegStr SHCTX "Software\Classes\Draftly.Markdown\shell\open\command" "" '"$INSTDIR\Draftly.exe" "%1"'

  WriteRegStr SHCTX "Software\Classes\.json\OpenWithProgids" "Draftly.Code" ""
  WriteRegStr SHCTX "Software\Classes\.js\OpenWithProgids" "Draftly.Code" ""
  WriteRegStr SHCTX "Software\Classes\.ts\OpenWithProgids" "Draftly.Code" ""
  WriteRegStr SHCTX "Software\Classes\.py\OpenWithProgids" "Draftly.Code" ""
  WriteRegStr SHCTX "Software\Classes\.html\OpenWithProgids" "Draftly.Code" ""
  WriteRegStr SHCTX "Software\Classes\Draftly.Code" "" "Arquivo de cÃ³digo"
  WriteRegStr SHCTX "Software\Classes\Draftly.Code\DefaultIcon" "" "$INSTDIR\resources\file-markdown.ico,0"
  WriteRegStr SHCTX "Software\Classes\Draftly.Code\shell\open\command" "" '"$INSTDIR\Draftly.exe" "%1"'

  !insertmacro UPDATEFILEASSOC
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ReadRegStr $0 SHCTX "Software\Classes\.md" ""
  ${If} $0 == "Draftly.Markdown"
    ReadRegStr $1 SHCTX "Software\Classes\.md" "Draftly.Markdown_backup"
    ${If} $1 == ""
      DeleteRegValue SHCTX "Software\Classes\.md" ""
    ${Else}
      WriteRegStr SHCTX "Software\Classes\.md" "" "$1"
    ${EndIf}
  ${EndIf}

  DeleteRegValue SHCTX "Software\Classes\.md" "Draftly.Markdown_backup"
  DeleteRegValue SHCTX "Software\Classes\.md\OpenWithProgids" "Draftly.Markdown"
  DeleteRegKey SHCTX "Software\Classes\Draftly.Markdown"
  DeleteRegValue SHCTX "Software\Classes\.json\OpenWithProgids" "Draftly.Code"
  DeleteRegValue SHCTX "Software\Classes\.js\OpenWithProgids" "Draftly.Code"
  DeleteRegValue SHCTX "Software\Classes\.ts\OpenWithProgids" "Draftly.Code"
  DeleteRegValue SHCTX "Software\Classes\.py\OpenWithProgids" "Draftly.Code"
  DeleteRegValue SHCTX "Software\Classes\.html\OpenWithProgids" "Draftly.Code"
  DeleteRegKey SHCTX "Software\Classes\Draftly.Code"

  !insertmacro UPDATEFILEASSOC
!macroend
