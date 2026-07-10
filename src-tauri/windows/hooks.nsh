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

  !insertmacro UPDATEFILEASSOC
!macroend
