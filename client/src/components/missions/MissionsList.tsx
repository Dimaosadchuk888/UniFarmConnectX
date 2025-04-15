import React, { useState, useEffect } from 'react';
import { MISSIONS } from '@/lib/constants';

// Типы статусов заданий
enum MissionStatus {
  AVAILABLE = 'available',
  PROCESSING = 'processing',
  COMPLETED = 'completed'
}

// Цвета для разных категорий
const getCategoryColors = (category: string) => {
  switch (category) {
    case 'Check-in дня':
      return {
        bg: 'bg-blue-500/20',
        text: 'text-blue-400'
      };
    case 'Приглашение':
      return {
        bg: 'bg-primary/20',
        text: 'text-primary'
      };
    case 'Соцсети':
      return {
        bg: 'bg-indigo-500/20',
        text: 'text-indigo-400'
      };
    case 'Бонусные':
      return {
        bg: 'bg-amber-500/20',
        text: 'text-amber-400'
      };
    default:
      return {
        bg: 'bg-gray-500/20',
        text: 'text-gray-400'
      };
  }
};

const MissionsList: React.FC = () => {
  // Состояние для анимаций и эффектов
  const [hoveredMission, setHoveredMission] = useState<number | null>(null);
  const [missionStatuses, setMissionStatuses] = useState<Map<number, MissionStatus>>(new Map());
  const [animatedMission, setAnimatedMission] = useState<number | null>(null);
  const [showReward, setShowReward] = useState<{id: number, reward: string} | null>(null);
  const [confettiActive, setConfettiActive] = useState<number | null>(null);
  
  // Эффект анимированного появления миссий при загрузке
  const [visibleMissions, setVisibleMissions] = useState<number[]>([]);
  
  useEffect(() => {
    // Постепенно показываем миссии одну за другой
    MISSIONS.forEach((mission, index) => {
      setTimeout(() => {
        setVisibleMissions(prev => [...prev, mission.id]);
      }, index * 150); // Каждая следующая миссия появляется через 150ms
    });
  }, []);
  
  // Обработчик выполнения миссии (только визуальный эффект)
  const handleCompleteMission = (missionId: number, reward: string) => {
    // Проверяем, что миссия ещё не выполнена и не в процессе
    if (missionStatuses.get(missionId) === MissionStatus.COMPLETED || 
        missionStatuses.get(missionId) === MissionStatus.PROCESSING) return;
    
    // Устанавливаем статус "в процессе"
    setMissionStatuses(prev => new Map(prev).set(missionId, MissionStatus.PROCESSING));
    setAnimatedMission(missionId);
    
    // После короткой анимации добавляем в список выполненных
    setTimeout(() => {
      setMissionStatuses(prev => new Map(prev).set(missionId, MissionStatus.COMPLETED));
      setShowReward({id: missionId, reward});
      setConfettiActive(missionId);
      
      // Скрываем сообщение о награде через 2 секунды
      setTimeout(() => {
        setShowReward(null);
        setAnimatedMission(null);
        
        // И убираем эффект конфетти через короткое время
        setTimeout(() => {
          setConfettiActive(null);
        }, 1000);
      }, 2000);
    }, 800);
  };
  
  // Функция для создания эффекта "конфетти"
  const renderConfetti = () => {
    return Array.from({ length: 30 }, (_, i) => {
      const colors = ['#A259FF', '#7E1AFF', '#5945FA', '#4A75FF', '#8959FF', '#FF59F2', '#FF8A59', '#FFDC59'];
      const size = Math.random() * 10 + 5; // От 5px до 15px
      const left = Math.random() * 100;
      const delay = Math.random() * 0.5;
      const duration = Math.random() * 1.5 + 1;
      const rotationStart = Math.random() * 360;
      const rotationEnd = rotationStart + Math.random() * 360 * (Math.random() > 0.5 ? 1 : -1);
      
      return (
        <div
          key={i}
          className="absolute rounded-md"
          style={{
            left: `${left}%`,
            top: '-5%',
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            boxShadow: `0 0 ${Math.floor(size/3)}px ${colors[Math.floor(Math.random() * colors.length)]}`,
            animation: `confettiFall ${duration}s ease-in forwards`,
            animationDelay: `${delay}s`,
            transform: `rotate(${rotationStart}deg)`,
          }}
        ></div>
      );
    });
  };
  
  return (
    <div className="space-y-5">
      
      {MISSIONS.map((mission) => {
        const isVisible = visibleMissions.includes(mission.id);
        const isHovered = hoveredMission === mission.id;
        const status = missionStatuses.get(mission.id) || MissionStatus.AVAILABLE;
        const isCompleted = status === MissionStatus.COMPLETED;
        const isProcessing = status === MissionStatus.PROCESSING;
        const isAnimating = animatedMission === mission.id;
        const isShowingReward = showReward?.id === mission.id;
        const categoryStyle = getCategoryColors(mission.category);
        
        return (
          <div 
            key={mission.id} 
            className={`
              bg-card rounded-xl p-5 shadow-lg 
              transition-all duration-500 relative
              ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}
              ${isHovered && !isCompleted ? 'shadow-xl shadow-primary/10 -translate-y-1' : ''}
              ${isCompleted ? 'bg-card shadow-md shadow-green-900/5 border border-accent/10' : ''}
              ${isAnimating ? 'scale-[1.02]' : 'scale-100'}
              overflow-hidden
            `}
            onMouseEnter={() => setHoveredMission(mission.id)}
            onMouseLeave={() => setHoveredMission(null)}
            style={{
              transitionDelay: `${MISSIONS.findIndex(m => m.id === mission.id) * 50}ms`
            }}
          >
            {/* Фоновый градиент для эффекта наведения */}
            {isHovered && !isCompleted && !isProcessing && (
              <div 
                className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50 transition-opacity duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(162, 89, 255, 0.05) 0%, rgba(0, 0, 0, 0) 60%)'
                }}
              ></div>
            )}
            
            {/* Индикатор категории */}
            <div className="absolute top-3 right-3">
              <span className={`
                inline-flex items-center px-2 py-1 rounded-full text-xs
                ${categoryStyle.bg} ${categoryStyle.text}
              `}>
                {mission.category === 'Check-in дня' && <i className="fas fa-calendar-day mr-1 text-[10px]"></i>}
                {mission.category === 'Приглашение' && <i className="fas fa-user-plus mr-1 text-[10px]"></i>}
                {mission.category === 'Соцсети' && <i className="fas fa-hashtag mr-1 text-[10px]"></i>}
                {mission.category === 'Бонусные' && <i className="fas fa-gift mr-1 text-[10px]"></i>}
                {mission.category}
              </span>
            </div>
            
            {/* Статус задания */}
            {isCompleted && (
              <div className="absolute top-3 left-3 px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
                <i className="fas fa-check mr-1"></i>
                Выполнено
              </div>
            )}
            
            {isProcessing && (
              <div className="absolute top-3 left-3 px-2 py-1 bg-amber-500/10 text-amber-500 text-xs font-medium rounded-full animate-pulse">
                <i className="fas fa-spinner fa-spin mr-1"></i>
                Ожидает проверки
              </div>
            )}
            
            <div className="flex items-center relative z-10 mt-2">
              {/* Круглая иконка задания */}
              <div className={`
                w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0
                transition-all duration-500
                ${isCompleted 
                  ? 'bg-accent/20 border border-accent' 
                  : isProcessing
                    ? 'bg-amber-500/10 border border-amber-500/50'
                    : 'bg-gradient-to-br from-primary/30 to-violet-500/20 border border-primary/30'
                }
                ${isAnimating ? 'scale-110' : ''}
                shadow-lg
              `}>
                <i className={`
                  ${mission.icon.includes('twitter') || mission.icon.includes('youtube') || mission.icon.includes('discord') ? 'fab' : 'fas'} 
                  fa-${mission.icon} 
                  text-xl
                  ${isCompleted ? 'text-accent' : isProcessing ? 'text-amber-400' : 'text-primary animate-pulse'}
                  ${isHovered && !isCompleted && !isProcessing ? 'scale-125' : ''}
                  transition-all duration-300
                `}></i>
                
                {/* Светящийся фон для иконки */}
                <div className={`
                  absolute inset-0 rounded-full blur-md -z-10 opacity-50
                  ${isCompleted ? 'bg-accent/30' : isProcessing ? 'bg-amber-500/30' : 'bg-primary/30'}
                  transition-opacity duration-500
                  ${isHovered && !isCompleted && !isProcessing ? 'opacity-80' : ''}
                `}></div>
              </div>
              
              <div className="ml-4 flex-grow">
                <h3 className={`
                  text-md font-semibold
                  transition-all duration-300
                  ${isHovered && !isCompleted && !isProcessing ? 'text-primary' : 'text-foreground'}
                `}>{mission.title}</h3>
                
                <p className="text-sm text-foreground/70 mt-1">
                  {mission.description}
                </p>
                
                <div className="flex justify-between items-center mt-3">
                  {/* Награда */}
                  <div className={`
                    px-3 py-1.5 rounded-lg text-sm font-bold
                    ${isCompleted ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}
                    transition-all duration-300
                    ${isHovered && !isCompleted && !isProcessing ? 'scale-105 shadow-lg shadow-primary/20' : ''}
                  `}>
                    <i className="fas fa-coins mr-1.5 text-xs"></i>
                    {mission.reward}
                  </div>
                  
                  {/* Кнопка действия */}
                  {!isCompleted && !isProcessing ? (
                    <button 
                      className={`
                        px-4 py-2 rounded-lg text-sm font-medium text-white
                        transition-all duration-300 overflow-hidden relative
                        ${isHovered ? 'shadow-lg shadow-primary/20' : 'shadow-md'}
                      `}
                      style={{
                        background: isHovered 
                          ? 'linear-gradient(90deg, #A259FF 0%, #B368F7 100%)' 
                          : 'linear-gradient(45deg, #A259FF 0%, #B368F7 100%)'
                      }}
                      onClick={() => handleCompleteMission(mission.id, mission.reward)}
                    >
                      {/* Эффект блеска при наведении */}
                      {isHovered && (
                        <div 
                          className="absolute inset-0 w-full h-full" 
                          style={{
                            background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)',
                            transform: 'translateX(-100%)',
                            animation: 'shimmer 1.5s infinite'
                          }}
                        ></div>
                      )}
                      <span className="relative z-10">Выполнить</span>
                    </button>
                  ) : (
                    <div className="flex items-center">
                      <div className={`
                        w-9 h-9 rounded-full flex items-center justify-center
                        ${isCompleted ? 'bg-accent/20' : 'bg-amber-500/20'}
                        transition-all duration-300
                      `}>
                        <i className={`
                          fas ${isCompleted ? 'fa-check' : 'fa-spinner fa-spin'} 
                          ${isCompleted ? 'text-accent' : 'text-amber-500'}
                          text-sm
                        `}></i>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Анимация получения награды с конфетти */}
            {isShowingReward && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl z-20 overflow-hidden">
                <div className="text-center animate-bounce z-30">
                  <div className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-400 to-accent bg-clip-text text-transparent">
                    +{showReward.reward}
                  </div>
                  <div className="text-lg text-white font-medium">
                    Награда получена!
                  </div>
                </div>
                
                {/* Конфетти эффект */}
                {confettiActive === mission.id && renderConfetti()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MissionsList;