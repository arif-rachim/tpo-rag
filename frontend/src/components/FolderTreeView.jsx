import { useState, useEffect } from 'react';
import { MdFolder, MdFolderOpen, MdInsertDriveFile, MdExpandMore, MdChevronRight } from 'react-icons/md';
import api from '../services/api';

export default function FolderTreeView({ onFolderSelect, onFileSelect, onContextMenu, refreshTrigger }) {
  const [tree, setTree] = useState(null);
  const [expanded, setExpanded] = useState(new Set([''])); // Root expanded by default
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTree();
  }, [refreshTrigger]);

  const fetchTree = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/folders/tree');
      if (response.data.success) {
        setTree(response.data.tree);
      }
    } catch (error) {
      console.error('Failed to fetch folder tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (path) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpanded(newExpanded);
  };

  const handleSelect = (node) => {
    setSelected(node.path);
    if (node.type === 'folder') {
      onFolderSelect?.(node);
    } else {
      onFileSelect?.(node);
    }
  };

  const renderNode = (node, depth = 0) => {
    const isExpanded = expanded.has(node.path);
    const isSelected = selected === node.path;
    const isFolder = node.type === 'folder';

    return (
      <div key={node.path || 'root'}>
        <div
          className={`
            flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer
            hover:bg-google-gray-100 transition-colors
            ${isSelected ? 'bg-google-blue bg-opacity-10' : ''}
          `}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => handleSelect(node)}
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu?.(node, e);
          }}
        >
          {/* Expand/collapse icon */}
          {isFolder && node.children?.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.path);
              }}
              className="w-4 h-4 flex items-center justify-center hover:bg-google-gray-200 rounded"
            >
              {isExpanded ? (
                <MdExpandMore className="w-4 h-4" />
              ) : (
                <MdChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          {(!isFolder || !node.children?.length) && <div className="w-4" />}

          {/* Folder/file icon */}
          {isFolder ? (
            isExpanded ? (
              <MdFolderOpen className="w-5 h-5 text-google-blue" />
            ) : (
              <MdFolder className="w-5 h-5 text-google-blue" />
            )
          ) : (
            <MdInsertDriveFile className="w-5 h-5 text-google-gray-500" />
          )}

          {/* Name */}
          <span className={`text-sm ${isSelected ? 'font-medium' : ''}`}>
            {node.name}
          </span>

          {/* Status badge for files */}
          {!isFolder && node.status === 'indexed' && (
            <span className="ml-auto text-xs text-google-green">✓</span>
          )}
          {!isFolder && node.status === 'not_indexed' && (
            <span className="ml-auto text-xs text-google-yellow">⏳</span>
          )}
        </div>

        {/* Render children if expanded */}
        {isFolder && isExpanded && node.children?.map(child =>
          renderNode(child, depth + 1)
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 text-google-gray-500">
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-google-gray-200 rounded w-3/4"></div>
          <div className="h-6 bg-google-gray-200 rounded w-2/3 ml-4"></div>
          <div className="h-6 bg-google-gray-200 rounded w-1/2 ml-8"></div>
        </div>
      </div>
    );
  }

  if (!tree) {
    return <div className="p-4 text-google-gray-500">No folders found</div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      {tree.children?.length > 0 ? (
        tree.children.map(child => renderNode(child, 0))
      ) : (
        <div className="p-4 text-center text-google-gray-500">
          <p>No documents or folders yet</p>
          <p className="text-sm mt-1">Upload files or create folders to get started</p>
        </div>
      )}
    </div>
  );
}
