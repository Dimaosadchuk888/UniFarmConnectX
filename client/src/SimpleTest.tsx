import React, { useState } from 'react';

export default function SimpleTest() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h1>React Test: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}