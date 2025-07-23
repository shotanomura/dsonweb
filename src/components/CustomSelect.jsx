import React, { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

function CustomSelect({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder = "選択してください",
  id 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selectRef = useRef(null);
  const listRef = useRef(null);

  // 外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // キーボード操作
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev < options.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : options.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0) {
            handleOptionClick(options[highlightedIndex]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, highlightedIndex, options]);

  // ハイライトされた項目をスクロール表示
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    setHighlightedIndex(-1);
  };

  const handleOptionClick = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const selectedOption = options.find(opt => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className="custom-select-container">
      {label && (
        <label htmlFor={id} className="custom-select-label">
          {label}
        </label>
      )}
      <div 
        ref={selectRef}
        className={`custom-select ${isOpen ? 'open' : ''}`}
        onClick={handleToggle}
        tabIndex={0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        id={id}
      >
        <div className="custom-select-display">
          <span className={`custom-select-text ${!selectedOption ? 'placeholder' : ''}`}>
            {displayText}
          </span>
          <span className={`custom-select-arrow ${isOpen ? 'open' : ''}`}>
            ▼
          </span>
        </div>
        
        {isOpen && (
          <div 
            ref={listRef}
            className="custom-select-dropdown"
            role="listbox"
          >
            {options.map((option, index) => (
              <div
                key={option.value}
                className={`custom-select-option ${
                  value === option.value ? 'selected' : ''
                } ${
                  index === highlightedIndex ? 'highlighted' : ''
                }`}
                onClick={() => handleOptionClick(option)}
                role="option"
                aria-selected={value === option.value}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomSelect;
