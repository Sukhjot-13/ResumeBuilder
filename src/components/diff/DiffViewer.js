
import React from 'react';
import { diffLines } from 'diff';

const DiffViewer = ({ originalText, newText }) => {
  const diffs = diffLines(originalText, newText);

  return (
    <div style={{ fontFamily: 'monospace', border: '1px solid #ccc', padding: '10px', whiteSpace: 'pre-wrap' }}>
      <h2>Changes</h2>
      <div>
        {diffs.map((part, index) => {
          const style = {
            color: part.added ? 'green' : part.removed ? 'red' : 'inherit',
            fontWeight: part.added || part.removed ? 'bold' : 'normal',
            textDecoration: part.removed ? 'line-through' : 'none',
          };
          return (
            <div key={index} style={style}>
              {part.added && <span style={{color: 'green'}}>+ </span>}
              {part.removed && <span style={{color: 'red'}}>- </span>}
              {part.value}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DiffViewer;
