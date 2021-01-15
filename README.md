# irc_chat_client

트위치 채팅용 IRC
-------------

트위치 IRC서버와 통신을 하기 위한 websock를 통하여 제작된 irc 통신모듈


클라이언트 측 처리를 위하여 웹 서비스에서 이용이 가능 하도록 개조를 하여 제작한것.
기존 irc통신은 Node.js/Python/Java와 같이 별도의 프로그램을 제작 하여 배포를 해야 하지만,
이러한 부분에서 연동 프로젝트가 기술력이 없고, 단순 프로그램으로 사용 되기 때문에
이를 해소하기 위하여 웹 툴깃으로 제작함

OBS특성상 웹 브라우져를 사용하기 때문에 이러한 선택은 적절하다고 생각되고, 중간 개입이 없기 때문에
사용자에게 무료의 서비스를 제공 가능함.



# # # 익명의 사용자

익명의 사용자는 사용자 클라이언트 이며, 특정 사용자가 접속을 할 때에 접속정보를 가지지 않는 상태이며.
IRC서버에 명령을 내리지 못하는 상태임으로 별도의 처리과정을 거치지 않음


# # # 로그인 사용자

로그인 사용자일 경우, 로그인 과정에서 여러가지 정보를 요하기 때문에 이러한 처리를 다 해주었고,
인증 과정을 거치기에 필요한 인증키를 기반으로 API와 연동하여 사용자 정보/방송정보를 불러오도록 하였다.
