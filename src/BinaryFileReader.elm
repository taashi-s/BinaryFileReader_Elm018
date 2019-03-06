module BinaryFileReader exposing
    ( Error(..)
    , FileContentArrayBuffer
    , FileContentBinaryString
    , FileContentDataUrl
    , FileRef
    , NativeFile
    , fileBody
    , filePart
    , parseDroppedFiles
    , parseSelectedFiles
    , postImageFileTask
    , prettyPrint
    , readAsArrayBuffer
    , readAsBinaryString
    , readAsDataUrl
    , readAsTextFile
    )

import Date exposing (Date)
import Debug exposing (log)
import Http exposing (Body, Part, jsonBody, stringBody)
import Json.Decode
    exposing
        ( Decoder
        , andThen
        , at
        , decodeValue
        , field
        , int
        , keyValuePairs
        , list
        , map
        , map4
        , maybe
        , null
        , oneOf
        , string
        , succeed
        , value
        )
import Json.Encode as Encode
import MimeType
import Native.BinaryFileReader
import Task exposing (Task, fail)


type alias FileRef =
    Json.Decode.Value


type alias FileContentArrayBuffer =
    Json.Decode.Value


type alias FileContentDataUrl =
    Json.Decode.Value


type alias FileContentBinaryString =
    Json.Decode.Value


type Error
    = NoValidBlob
    | ReadFail
    | NotTextFile


readAsTextFile : FileRef -> Task Error ( Date, String )
readAsTextFile fileRef =
    if isTextFile fileRef then
        Native.BinaryFileReader.readAsTextFile fileRef

    else
        fail NotTextFile


readAsArrayBuffer : FileRef -> Task Error ( Date, FileContentArrayBuffer )
readAsArrayBuffer =
    Native.BinaryFileReader.readAsArrayBuffer


readAsDataUrl : FileRef -> Task Error ( Date, String )
readAsDataUrl =
    Native.BinaryFileReader.readAsDataUrl


readAsBinaryString : FileRef -> Task Error ( Date, FileContentBinaryString )
readAsBinaryString =
    Native.BinaryFileReader.readAsBinaryString


filePart : String -> NativeFile -> Part
filePart name nf =
    Native.BinaryFileReader.filePart name nf.blob


fileBody file fcBinaryString =
    let
        contentsType =
            log "contentsType" <|
                case file.mimeType of
                    Just mt ->
                        MimeType.toString mt

                    _ ->
                        "application/json"
    in
    Native.BinaryFileReader.fileBody contentsType file.blob


postImageFileTask a =
    Native.BinaryFileReader.postImageFileTask a Nothing


prettyPrint : Error -> String
prettyPrint err =
    case err of
        ReadFail ->
            "File reading error"

        NoValidBlob ->
            "Blob was not valid"

        NotTextFile ->
            "Not a text file"


type alias NativeFile =
    { name : String
    , size : Int
    , mimeType : Maybe MimeType.MimeType
    , blob : FileRef
    }


parseSelectedFiles : Decoder (List NativeFile)
parseSelectedFiles =
    fileParser "target"


parseDroppedFiles : Decoder (List NativeFile)
parseDroppedFiles =
    fileParser "dataTransfer"


isTextFile : FileRef -> Bool
isTextFile fileRef =
    case decodeValue mtypeDecoder fileRef of
        Result.Ok mimeVal ->
            case mimeVal of
                Just mimeType ->
                    case mimeType of
                        MimeType.Text text ->
                            True

                        _ ->
                            True

                Nothing ->
                    True

        Result.Err _ ->
            False


fileParser : String -> Decoder (List NativeFile)
fileParser fieldName =
    at
        [ fieldName, "files" ]
    <|
        map (List.filterMap Tuple.second) (keyValuePairs <| maybe nativeFileDecoder)


mtypeDecoder : Decoder (Maybe MimeType.MimeType)
mtypeDecoder =
    map MimeType.parseMimeType (field "type" string)


nativeFileDecoder : Decoder NativeFile
nativeFileDecoder =
    map4 NativeFile
        (field "name" string)
        (field "size" int)
        mtypeDecoder
        value
