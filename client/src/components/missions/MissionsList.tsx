import React, { useState, useEffect } from 'react';
import { MISSIONS } from '@/lib/constants';

const MissionsList: React.FC = () => {
  // Состояние для анимаций и эффектов
  const [hoveredMission, setHoveredMission] = useState<number | null>(null);
  const [completedMissions, setCompletedMissions] = useState<number[]>([]);
  const [animatedMission, setAnimatedMission] = useState<number | null>(null);
  const [showReward, setShowReward] = useState<{id: number, reward: string} | null>(null);
  
  // Эффект анимированного появления миссий при загрузке
  const [visibleMissions, setVisibleMissions] = useState<number[]>([]);
  
  useEffect(() => {
    // Постепенно показываем миссии одну за другой
    MISSIONS.forEach((mission, index) => {
      setTimeout(() => {
        setVisibleMissions(prev => [...prev, mission.id]);
      }, index * 100); // Каждая следующая миссия появляется через 100ms
    });
  }, []);
  
  // Обработчик выполнения миссии (только визуальный эффект)
  const handleCompleteMission = (missionId: number, reward: string) => {
    if (completedMissions.includes(missionId)) return;
    
    setAnimatedMission(missionId);
    
    // После короткой анимации добавляем в список выполненных
    setTimeout(() => {
      setCompletedMissions(prev => [...prev, missionId]);
      setShowReward({id: missionId, reward});
      
      // Скрываем сообщение о награде через 2 секунды
      setTimeout(() => {
        setShowReward(null);
        setAnimatedMission(null);
      }, 2000);
    }, 500);
  };
  
  return (
    <div className="space-y-4">
      {MISSIONS.map((mission) => {
        const isVisible = visibleMissions.includes(mission.id);
        const isHovered = hoveredMission === mission.id;
        const isCompleted = completedMissions.includes(mission.id);
        const isAnimating = animatedMission === mission.id;
        const isShowingReward = showReward?.id === mission.id;
        
        return (
          <div 
            key={mission.id} 
            className={`
              bg-card rounded-xl p-4 shadow-lg 
              transition-all duration-500 relative
              ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              ${isHovered ? 'shadow-xl' : ''}
              ${isCompleted ? 'bg-primary/5' : ''}
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
            {isHovered && !isCompleted && (
              <div 
                className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50"
                style={{
                  background: 'linear-gradient(135deg, rgba(162, 89, 255, 0.05) 0%, rgba(0, 0, 0, 0) 60%)'
                }}
              ></div>
            )}
            
            {/* Фоновый эффект для выполненных миссий */}
            {isCompleted && (
              <div className="absolute top-0 right-0 px-2 py-1 bg-primary/10 text-primary text-xs font-medium">
                Выполнено
              </div>
            )}
            
            <div className="flex items-center relative z-10">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                transition-all duration-300
                ${isCompleted 
                  ? 'bg-accent/20' 
                  : isHovered 
                    ? 'bg-primary/30' 
                    : 'bg-primary/20'
                }
                ${isAnimating ? 'scale-110' : ''}
              `}>
                <i className={`
                  ${mission.icon.startsWith('you') ? 'fab' : 'fas'} 
                  fa-${mission.icon} 
                  text-xl
                  ${isCompleted ? 'text-accent' : 'text-primary'}
                  ${isHovered ? 'float-animation' : ''}
                `}></i>
              </div>
              
              <div className="ml-3 flex-grow">
                <h3 className={`
                  text-md font-medium
                  transition-all duration-300
                  ${isHovered ? 'transform translate-x-1' : ''}
                `}>{mission.title}</h3>
                
                <div className="flex justify-between items-center mt-1">
                  <p className={`
                    text-xs transition-all duration-300
                    ${isCompleted ? 'text-accent' : 'text-foreground opacity-70'}
                  `}>
                    Награда: {mission.reward}
                  </p>
                  
                  {!isCompleted ? (
                    <button 
                      className={`
                        px-3 py-1 rounded-lg text-sm font-medium text-white
                        transition-all duration-300 overflow-hidden relative
                        ${isHovered ? 'shadow-md' : ''}
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
                      <div className="w-5 h-5 bg-accent/20 rounded-full flex items-center justify-center">
                        <i className="fas fa-check text-accent text-xs"></i>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Анимация получения награды */}
            {isShowingReward && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl z-20">
                <div className="text-center animate-bounce">
                  <div className="text-2xl font-bold text-accent mb-1">
                    +{showReward.reward}
                  </div>
                  <div className="text-sm text-white">
                    Награда получена!
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MissionsList;
