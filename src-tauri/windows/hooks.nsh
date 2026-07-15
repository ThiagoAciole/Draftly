!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr SHCTX "Software\Classes\Draftly.Markdown\DefaultIcon" "" "$INSTDIR\resources\file-markdown.ico,0"
  WriteRegStr SHCTX "Software\Classes\Draftly.Text\DefaultIcon" "" "$INSTDIR\resources\file-txt.ico,0"
  WriteRegStr SHCTX "Software\Classes\Draftly.JSON\DefaultIcon" "" "$INSTDIR\resources\file-json.ico,0"
  WriteRegStr SHCTX "Software\Classes\Draftly.JavaScript\DefaultIcon" "" "$INSTDIR\resources\file-js.ico,0"
  WriteRegStr SHCTX "Software\Classes\Draftly.TypeScript\DefaultIcon" "" "$INSTDIR\resources\file-ts.ico,0"
  WriteRegStr SHCTX "Software\Classes\Draftly.Python\DefaultIcon" "" "$INSTDIR\resources\file-py.ico,0"
  WriteRegStr SHCTX "Software\Classes\Draftly.HTML\DefaultIcon" "" "$INSTDIR\resources\file-html.ico,0"

  !insertmacro UPDATEFILEASSOC
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  !insertmacro UPDATEFILEASSOC
!macroend
