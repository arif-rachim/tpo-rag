import { MdCreateNewFolder, MdDelete, MdUpload } from 'react-icons/md';

export default function FolderContextMenu({ node, position, onClose, onCreateFolder, onDelete, onUpload }) {
  const isFolder = node.type === 'folder';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Menu */}
      <div
        className="fixed bg-white rounded-lg shadow-google-md border border-google-gray-200 py-1 z-50 min-w-[160px]"
        style={{ top: position.y, left: position.x }}
      >
        {isFolder && (
          <>
            <button
              onClick={() => { onCreateFolder(); onClose(); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-google-gray-700 hover:bg-google-gray-100"
            >
              <MdCreateNewFolder className="w-4 h-4" />
              New Subfolder
            </button>
            <button
              onClick={() => { onUpload(); onClose(); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-google-gray-700 hover:bg-google-gray-100"
            >
              <MdUpload className="w-4 h-4" />
              Upload Here
            </button>
            <div className="border-t border-google-gray-200 my-1" />
          </>
        )}
        <button
          onClick={() => { onDelete(); onClose(); }}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-google-red hover:bg-red-50"
        >
          <MdDelete className="w-4 h-4" />
          Delete {isFolder ? 'Folder' : 'File'}
        </button>
      </div>
    </>
  );
}
